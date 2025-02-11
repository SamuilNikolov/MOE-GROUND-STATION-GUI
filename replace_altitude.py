import pandas as pd

# 1. Read in the CSV files.
df1 = pd.read_csv("henry-clean.csv")   # Contains: SystemTimestamp (ISO datetime), Timestamp, Latitude, ..., Altitude, etc.
df2 = pd.read_csv("l3-flight-sd.csv")       # Contains: Timestamp, Latitude, Longitude, Velocity, Altitude, AltitudeGPS, AccelX, AccelY, AccelZ, Temperature

# 2. Convert the merge key 'Timestamp' in both DataFrames to numeric (integers).
df1['Timestamp'] = pd.to_numeric(df1['Timestamp'], errors='coerce').astype(int)
df2['Timestamp'] = pd.to_numeric(df2['Timestamp'], errors='coerce').astype(int)

# 3. Adjust df2's Timestamp values so they align with df1.
#    Compute an offset using the first value in each file.
offset = df1['Timestamp'].iloc[0] - df2['Timestamp'].iloc[0]
df2['Timestamp'] = df2['Timestamp'] + offset

# 4. Sort both DataFrames by 'Timestamp' (required for merge_asof).
df1.sort_values("Timestamp", inplace=True)
df2.sort_values("Timestamp", inplace=True)

# 5. Merge df1 with the altitude values from df2 using merge_asof.
#    This assigns to each row in df1 the most recent altitude value (from df2) where df2.Timestamp <= df1.Timestamp.
merged = pd.merge_asof(
    df1,
    df2[['Timestamp', 'Altitude']],
    on='Timestamp',
    direction='backward',  # For each df1 row, take the most recent available altitude from df2.
    suffixes=('', '_new')
)

# 6. Replace df1's Altitude column with the altitude from df2.
merged['Altitude'] = merged['Altitude_new']
merged.drop(columns=['Altitude_new'], inplace=True)

# 7. Write out the updated file.
merged.to_csv("henry-clean-altitude.csv", index=False)
