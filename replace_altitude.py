import pandas as pd

# 1. Read in the CSV files.
df1 = pd.read_csv("flight2-laptop.csv")   # Contains: SystemTimestamp (ISO datetime), Timestamp, Latitude, ..., Altitude, etc.
df2 = pd.read_csv("flight-2-local.csv")    # Contains: Timestamp, Latitude, Longitude, Velocity, Altitude, xAcc, yAcc, zAcc, Temperature

# 2. Convert the merge key 'Timestamp' in both dataframes to numeric (integers).
df1['Timestamp'] = pd.to_numeric(df1['Timestamp'], errors='coerce').astype(int)
df2['Timestamp'] = pd.to_numeric(df2['Timestamp'], errors='coerce').astype(int)

# 3. Sort both DataFrames by 'Timestamp' (required for merge_asof).
df1.sort_values("Timestamp", inplace=True)
df2.sort_values("Timestamp", inplace=True)

# 4. Merge df1 with the altitude values from df2 using merge_asof.
#    Since both files have a 'Timestamp' column, we merge on that key.
merged = pd.merge_asof(
    df1,
    df2[['Timestamp', 'Altitude']],
    on='Timestamp',
    direction='backward',  # For each row in df1, use the most recent df2 altitude.
    suffixes=('', '_new')
)

# 5. Replace df1's Altitude column with the altitude from df2.
merged['Altitude'] = merged['Altitude_new']
merged.drop(columns=['Altitude_new'], inplace=True)

# 6. Write out the updated file.
merged.to_csv("file1_updated.csv", index=False)
