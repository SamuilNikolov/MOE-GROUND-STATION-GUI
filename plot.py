import pandas as pd
import matplotlib.pyplot as plt

# Replace 'data.csv' with your CSV filename/path if different
csv_file = 'flight2-ranges.csv'

# Read the CSV file into a pandas DataFrame
df = pd.read_csv(csv_file)

# Extract the Distance and Max Range columns
distances = df['Distance']
max_ranges = df['Max Range (km)']

# Create a figure and axis
fig, ax = plt.subplots()

# Set x-axis to a logarithmic scale
ax.set_xscale('log')

# Plot Distance vs Max Range
# You can switch between scatter or line depending on your preference:
# For a line plot:
# ax.plot(distances, max_ranges, marker='o', linestyle='-')
# For a scatter plot:
ax.scatter(distances, max_ranges, color='blue')

# Label the axes
ax.set_xlabel('Distance')
ax.set_ylabel('Max Range (km)')
ax.set_title('Distance vs. Max Range')

# Optional grid
ax.grid(True, which="both", ls="--")

# Show the plot
plt.show()
