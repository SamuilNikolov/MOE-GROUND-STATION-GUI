#!/usr/bin/env python3
import csv
import math

# Filenames (adjust as needed)
initial_filename = 'henry-clean-altitude.csv'
gps_filename = 'gps.csv'
output_filename = 'henry-clean-altitude-gps.csv'

def load_csv_as_dicts(filename):
    with open(filename, 'r', newline='') as f:
        reader = csv.DictReader(f)
        return list(reader)

def main():
    # Load the two CSV files
    initial_rows = load_csv_as_dicts(initial_filename)
    gps_rows = load_csv_as_dicts(gps_filename)

    if not initial_rows:
        print("Initial file is empty!")
        return
    if not gps_rows:
        print("GPS file is empty!")
        return

    # Get the starting timestamp from the initial file (assumed to be in milliseconds)
    try:
        initial_start = int(initial_rows[0]['Timestamp'])
    except (KeyError, ValueError):
        print("Could not read the 'Timestamp' field from the initial file.")
        return

    # For each row in the initial file, calculate the elapsed time (in ms) and determine the gps row index.
    for row in initial_rows:
        try:
            ts = int(row['Timestamp'])
        except ValueError:
            print("Invalid Timestamp value:", row.get('Timestamp'))
            continue

        elapsed_ms = ts - initial_start
        # Since the GPS file updates about once per second, each second corresponds to one GPS row.
        # Use integer division (floor) to pick the appropriate row.
        gps_index = elapsed_ms // 1000

        # If we run past the end of the gps rows, use the last available gps reading.
        if gps_index >= len(gps_rows):
            gps_index = len(gps_rows) - 1

        gps_row = gps_rows[gps_index]
        # Update the Latitude and Longitude fields with the tracker values from the gps file.
        # (The gps file has columns "TRACKER Lat" and "TRACKER Lon".)
        row['Latitude'] = gps_row.get('TRACKER Lat', row.get('Latitude'))
        row['Longitude'] = gps_row.get('TRACKER Lon', row.get('Longitude'))

    # Write out the merged CSV
    fieldnames = initial_rows[0].keys()  # keep the original order
    with open(output_filename, 'w', newline='') as f_out:
        writer = csv.DictWriter(f_out, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(initial_rows)

    print(f"Merged file written to {output_filename}")

if __name__ == '__main__':
    main()
