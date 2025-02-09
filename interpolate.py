#!/usr/bin/env python3
import csv

def interpolate(value, start_val, end_val, start_time, end_time):
    """
    Linearly interpolate a value between start_val and end_val based on the
    fraction of (value - start_time) / (end_time - start_time).
    """
    fraction = (value - start_time) / (end_time - start_time)
    return start_val + fraction * (end_val - start_val)

def main():
    # Define file names (adjust these as necessary)
    input_file = 'yantra data flight 2.csv'
    output_file = 'flight2-3.csv'
    
    # Define the start and end coordinates for interpolation.
    start_lat = 27.93318457539223
    start_lon = -80.70954861471066
    end_lat   = 27.93313577679315
    end_lon   = -80.71036862137707
    
    # Define the first and last timestamps (used to compute the fraction).
    first_timestamp = 2430823
    last_timestamp  = 2486792
    
    # Read the input CSV data.
    with open(input_file, mode='r', newline='') as infile:
        reader = csv.DictReader(infile)
        # Save the header order to write later.
        fieldnames = reader.fieldnames
        rows = list(reader)
    
    # Process each row, updating the Latitude and Longitude values.
    for row in rows:
        # Convert the Timestamp from string to a number (int or float as appropriate)
        ts = float(row['Timestamp'])
        # Compute new latitude and longitude by linear interpolation.
        new_lat = interpolate(ts, start_lat, end_lat, first_timestamp, last_timestamp)
        new_lon = interpolate(ts, start_lon, end_lon, first_timestamp, last_timestamp)
        # Update the row.
        row['Latitude'] = new_lat
        row['Longitude'] = new_lon

    # Write the updated rows to the output CSV file.
    with open(output_file, mode='w', newline='') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Interpolation complete. Updated data saved to '{output_file}'.")

if __name__ == '__main__':
    main()
