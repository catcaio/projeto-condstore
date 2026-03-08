import os
import sys
import json
import pdfplumber
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

all_data = {
    'movvi': [],
    'braspress': [],
    'mengue': []
}

DOWNLOADS_DIR = r"C:\Users\cr_bn\Downloads"

def find_file(keyword, ext):
    for f in os.listdir(DOWNLOADS_DIR):
        if keyword.lower() in f.lower() and f.lower().endswith(ext.lower()) and not f.startswith('~'):
            return os.path.join(DOWNLOADS_DIR, f)
    return None

def extract_movvi_xlsx():
    path = find_file("movvi", ".xlsx")
    if not path:
        print("Movvi XLSX not found")
        return
    print(f"\n--- PARSING {os.path.basename(path)} ---")
    df = pd.read_excel(path, sheet_name=0, header=None)
    
    for i, row in df.iterrows():
        all_data['movvi'].append([x if pd.notna(x) else None for x in row.tolist()])

def extract_pdf_tables(keyword):
    path = find_file(keyword, ".pdf")
    if not path:
        print(f"{keyword} PDF not found")
        return
    
    print(f"\n--- PARSING {os.path.basename(path)} ---")
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if any(x is not None for x in row):
                            # clean up newlines in cells
                            clean_row = [str(x).replace('\n', ' ').strip() if x is not None else None for x in row]
                            all_data[keyword].append(clean_row)
    except Exception as e:
        print(f"Error parsing {keyword}: {e}")

if __name__ == "__main__":
    extract_movvi_xlsx()
    extract_pdf_tables("braspress")
    extract_pdf_tables("mengue")
    
    with open("raw_tables.json", "w", encoding="utf-8") as f:
        json.dump(all_data, f, indent=2, default=str)
    print("Saved to raw_tables.json")
