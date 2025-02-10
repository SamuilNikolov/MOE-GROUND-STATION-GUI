import csv
import math

# WGS84 ellipsoid constants
a = 6378137.0          # semi-major axis in meters
f = 1/298.257223563    # flattening
b = a * (1 - f)        # semi-minor axis

def geodetic_to_ecef(lat, lon, alt):
    """
    Convert geodetic coordinates to ECEF.
    lat, lon in degrees; alt in meters.
    Returns (x, y, z) in meters.
    """
    # Convert degrees to radians
    lat_rad = math.radians(lat)
    lon_rad = math.radians(lon)
    
    # Prime vertical radius of curvature
    N = a / math.sqrt(1 - (2*f - f*f) * (math.sin(lat_rad)**2))
    
    x = (N + alt) * math.cos(lat_rad) * math.cos(lon_rad)
    y = (N + alt) * math.cos(lat_rad) * math.sin(lon_rad)
    z = (N * (1 - (2*f - f*f)) + alt) * math.sin(lat_rad)
    
    return x, y, z

def calculate_distance(point1, point2):
    """Calculate the Euclidean distance between two 3D points."""
    return math.sqrt((point1[0]-point2[0])**2 +
                     (point1[1]-point2[1])**2 +
                     (point1[2]-point2[2])**2)

def process_csv(input_file_path, output_file_path, ground_lat, ground_lon, ground_alt):
    # Convert ground station coordinates to ECEF
    ground_ecef = geodetic_to_ecef(ground_lat, ground_lon, ground_alt)
    print(f"Ground station ECEF coordinates: {ground_ecef}")
    
    # Open the input CSV for reading and the output CSV for writing
    with open(input_file_path, newline='') as csvfile_in, open(output_file_path, 'w', newline='') as csvfile_out:
        reader = csv.DictReader(csvfile_in)
        # Append the new column for distance
        fieldnames = reader.fieldnames + ['Distance']
        writer = csv.DictWriter(csvfile_out, fieldnames=fieldnames)
        writer.writeheader()
        
        print("Processing data points and writing to new file:")
        for row in reader:
            try:
                # Parse geographic coordinates from the CSV row
                lat = float(row['Latitude'])
                lon = float(row['Longitude'])
                alt = float(row['Altitude'])
            except KeyError:
                print("CSV does not contain required headers: 'Latitude', 'Longitude', 'Altitude'")
                return
            except ValueError:
                # Skip rows with invalid data
                continue
            
            # Convert the data point to ECEF coordinates
            point_ecef = geodetic_to_ecef(lat, lon, alt)
            
            # Calculate the Euclidean distance
            distance = calculate_distance(ground_ecef, point_ecef)
            
            # Add the calculated distance to the current row
            row['Distance'] = f"{distance:.2f}"  # formatted as a string with two decimals
            
            # Write the updated row to the output CSV
            writer.writerow(row)
            
            # Optionally, print the timestamp and distance
            timestamp = row.get('SystemTimestamp', 'N/A')
            print(f"Timestamp: {timestamp}, Distance: {distance:.2f} meters")
            print(f"altitude: {alt}")

if __name__ == "__main__":
    # Set the ground station coordinates (latitude, longitude, altitude in meters)
    ground_latitude = 27.93241
    ground_longitude = -80.7095
    ground_altitude = 10  # Adjust if needed

    # Define the paths for the input and output CSV files
    input_csv_file_path = "henry-gc-l3-gps-altitude.csv"  # Replace with your input file path
    output_csv_file_path = "henry-gc-l3-with-distance.csv"  # The new file with distances

    process_csv(input_csv_file_path, output_csv_file_path, ground_latitude, ground_longitude, ground_altitude)
