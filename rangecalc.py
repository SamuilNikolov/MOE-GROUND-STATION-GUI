import csv

# Input and output file names
INPUT_FILE = 'flight2-omni-range-synced-with-distance.csv'
OUTPUT_FILE = 'flight2-ranges.csv'

# Constants in the formula
F = -126

def calculate_value(rssi, distance):
    """
    Calculates the value using the formula:
      c = |rssi - F| / 20
      result = distance * (10 ** c)
    """
    c = abs(rssi - F) / 20.0
    print(f"RSSI: {rssi}, distance: {distance}, c: {c}")
    return distance * (10 ** c)

def process_csv(input_file, output_file):
    with open(input_file, newline='') as csv_in, open(output_file, 'w', newline='') as csv_out:
        reader = csv.reader(csv_in)
        writer = csv.writer(csv_out)
        
        # Read header and append new column header
        header = next(reader)
        header.append("CalculatedValue")
        writer.writerow(header)
        
        for row in reader:
            try:
                # According to your header, distance is the 6th column and RSSI is the 11th column.
                # Python indexing starts at 0, so:
                distance = float(row[5])
                rssi = float(row[10])
            except (IndexError, ValueError) as e:
                # Skip rows that cannot be parsed properly
                print(f"Skipping row due to error: {e}")
                continue

            # Calculate the value using the provided formula
            calc_value = calculate_value(rssi, distance)
            
            # Append the calculated value to the row and write it out
            row.append(calc_value/1000)
            writer.writerow(row)

if __name__ == '__main__':
    process_csv(INPUT_FILE, OUTPUT_FILE)
    print(f"Processed data written to {OUTPUT_FILE}")
