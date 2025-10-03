# CSV Import/Export Feature

## CSV Import Functionality

Your expense tracker now supports importing CSV files! This allows you to:

### 📤 **Export Your Data**
- Click "Export CSV" to download your current expenses
- Creates a file called `expenses_tracker.csv`
- Contains: Date, Category, Description, Amount

### 📥 **Import CSV Data**
- Click "Import CSV" to upload expense data
- Supports various CSV formats
- Auto-categorizes expenses intelligently
- Adds new categories automatically

## CSV Format Requirements

### Required Columns
Your CSV must contain at least:
- **Date** column (formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY)
- **Amount** column (numbers, can include currency symbols)

### Optional Columns
- **Category** (if missing, auto-categorization will be applied)
- **Description** (if missing, default descriptions will be used)

### Example CSV Format
```csv
Date,Category,Description,Amount
2024-10-01,Food,Coffee at Starbucks,5.50
2024-10-02,Transportation,Uber ride,12.00
2024-10-03,Shopping,Amazon purchase,25.99
```

## Auto-Categorization

When importing, the app automatically categorizes expenses based on keywords:

### 🍔 **Food**
- Keywords: restaurant, food, cafe, coffee, lunch, dinner, grocery, supermarket
- Examples: "Starbucks", "McDonald's", "Whole Foods"

### 🚗 **Transportation** 
- Keywords: uber, taxi, bus, train, fuel, gas, parking, flight
- Examples: "Uber ride", "Gas station", "Parking meter"

### 🛍️ **Shopping**
- Keywords: amazon, shop, store, mall, purchase, clothing, electronics
- Examples: "Amazon order", "Target shopping", "Best Buy"

### 🎬 **Entertainment**
- Keywords: movie, cinema, concert, game, netflix, spotify, bar
- Examples: "Netflix subscription", "Movie theater", "Concert tickets"

### 💡 **Bills & Utilities**
- Keywords: electricity, water, internet, phone, rent, insurance
- High amounts (>₹1000) are often categorized here
- Examples: "Electric bill", "Internet provider", "Rent payment"

### 🏥 **Healthcare**
- Keywords: doctor, hospital, medical, pharmacy, medicine, health
- Examples: "Doctor visit", "Pharmacy purchase", "Health insurance"

### 📚 **Education**
- Keywords: school, university, course, book, education, tuition
- Examples: "Coursera subscription", "Textbook purchase", "Tuition fee"

### 📂 **Others**
- Any expense that doesn't match the above categories

## Features

### ✨ **Smart Import**
- Automatically detects column headers (case-insensitive)
- Handles various date formats
- Removes currency symbols from amounts
- Creates new categories as needed
- Shows success message with import count

### 🔄 **Data Processing**
- Validates dates and amounts
- Skips invalid rows
- Assigns unique IDs to imported expenses
- Merges with existing data (doesn't overwrite)

### 📊 **Instant Visualization**
After import, you'll immediately see:
- Updated summary cards with new totals
- Expenses plotted on the timeline chart
- Category breakdown with percentages
- Expense history with proper sorting

## Sample File

A sample CSV file (`sample_expenses.csv`) is included in your project directory. You can use this to test the import functionality.

## Supported File Types
- `.csv` files only
- UTF-8 encoding recommended
- Comma-separated values

## Tips for Best Results

1. **Clean Data**: Remove empty rows and ensure consistent formatting
2. **Clear Descriptions**: Use descriptive text for better auto-categorization
3. **Date Format**: Use YYYY-MM-DD format for best compatibility
4. **Amount Format**: Use numbers only or with standard currency symbols
5. **Headers**: Include column headers in the first row

## Error Handling
- Invalid dates default to today's date
- Invalid amounts are skipped
- Missing categories trigger auto-categorization
- Empty rows are ignored
- Shows alert if required columns are missing