import csv
from datetime import datetime, timedelta

# Filenames – adjust as needed
flight_file = 'flight2-omni-range.csv'
gps_file = 'gps.csv'
output_file = 'flight2-omni-range-synced.csv'

# -----------------------------
# STEP 1: Process the flight file
# -----------------------------

flight_rows = []
with open(flight_file, newline='') as f:
    reader = csv.DictReader(f)
    flight_fieldnames = reader.fieldnames[:]  # keep header order
    for row in reader:
        # Convert the "Timestamp" field (ms since launch) to an integer.
        try:
            row['Timestamp'] = int(row['Timestamp'])
        except Exception as e:
            raise ValueError(f"Error converting Timestamp to int in row {row}: {e}")
        flight_rows.append(row)

if not flight_rows:
    raise ValueError("No flight records found.")

# Parse the first flight row’s SystemTimestamp (an ISO8601 string)
# Remove trailing 'Z' and add timezone info if needed.
first_sys = flight_rows[0]['SystemTimestamp']
try:
    # This expects a format like "2025-02-08T16:40:28.259Z"
    flight_first_time = datetime.fromisoformat(first_sys.replace("Z", "+00:00"))
except Exception as e:
    raise ValueError(f"Error parsing SystemTimestamp '{first_sys}': {e}")

# Compute the absolute launch time:
#   launch_time = first_flight.SystemTimestamp – (first_flight.Timestamp in seconds)
first_timestamp_ms = flight_rows[0]['Timestamp']
launch_time = flight_first_time - timedelta(milliseconds=first_timestamp_ms)
print(f"Computed launch time: {launch_time.isoformat()}")

# For each flight row, compute an absolute time using launch_time and the Timestamp.
for row in flight_rows:
    row_abs_time = launch_time + timedelta(milliseconds=row['Timestamp'])
    row['abs_time'] = row_abs_time  # store for later comparison

# -----------------------------
# STEP 2: Process the GPS file
# -----------------------------
gps_rows = []
with open(gps_file, newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Parse the DATE field from gps file (format: m/d/YYYY)
        try:
            gps_date = datetime.strptime(row['DATE'], "%m/%d/%Y").date()
        except Exception as e:
            raise ValueError(f"Error parsing DATE '{row['DATE']}' in gps row {row}: {e}")
            
        # Parse the TIME field.
        # We assume the GPS TIME is in "MM:SS.s" format.
        try:
            parts = row['TIME'].split(":")
            if len(parts) != 2:
                raise ValueError("Expected format MM:SS.s")
            gps_minute = int(parts[0])
            gps_second = float(parts[1])
        except Exception as e:
            raise ValueError(f"Error parsing TIME '{row['TIME']}' in gps row {row}: {e}")
            
        # Use the same hour as the flight_first_time and make the datetime timezone-aware.
        gps_abs_time = datetime(
            year=gps_date.year,
            month=gps_date.month,
            day=gps_date.day,
            hour=flight_first_time.hour,  # using the flight record's hour
            minute=gps_minute,
            second=int(gps_second),
            microsecond=int((gps_second - int(gps_second)) * 1_000_000),
            tzinfo=flight_first_time.tzinfo  # attach the same tzinfo
        )
        row['abs_time'] = gps_abs_time
        gps_rows.append(row)

if not gps_rows:
    raise ValueError("No GPS records found.")

# Sort the GPS rows by absolute time.
gps_rows.sort(key=lambda r: r['abs_time'])

# -----------------------------
# STEP 3: Sync – for each flight row, select the appropriate GPS fix.
# -----------------------------
for row in flight_rows:
    flight_abs = row['abs_time']
    current_gps = None
    for gps_row in gps_rows:
        if gps_row['abs_time'] <= flight_abs:
            current_gps = gps_row
        else:
            break
    if current_gps is None:
        current_gps = gps_rows[0]
    # Replace Latitude and Longitude in the flight row with the chosen GPS fix.
    row['Latitude'] = current_gps['TRACKER Lat']
    row['Longitude'] = current_gps['TRACKER Lon']

# -----------------------------
# STEP 4: Write the updated flight file
# -----------------------------
with open(output_file, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=flight_fieldnames)
    writer.writeheader()
    for row in flight_rows:
        row.pop('abs_time', None)  # remove helper field
        writer.writerow(row)

print(f"Synced flight file written to {output_file}")
