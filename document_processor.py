import fitz  # PyMuPDF
import os
import uuid
import pandas as pd
import json
import re
from thefuzz import fuzz
from docx import Document


def is_match(search_name, text, threshold=80):
    if not text or not search_name:
        return False
    # Case insensitive partial match using fuzzy scoring
    score = fuzz.partial_ratio(search_name.lower(), text.lower())
    return score >= threshold


def tag_document(text):
    text_lower = text.lower()
    tags = set()
    if 'result' in text_lower or 'mark' in text_lower or 'grade' in text_lower or 'cgpa' in text_lower:
        tags.add('Result')
    if 'report' in text_lower or 'summary' in text_lower:
        tags.add('Report')
    if 'certificate' in text_lower or 'award' in text_lower:
        tags.add('Certificate')
    if not tags:
        tags.add('Document')
    return list(tags)


def generate_summary(tags, total_matches):
    tag_str = ", ".join(tags)
    return f"Extracted {total_matches} records from {tag_str} files."


def extract_insights(data_list):
    insights = {
        "highest": 0,
        "lowest": 0,
        "average": 0,
        "total_records": len(data_list),
        "trend": []
    }
    if not data_list:
        return insights

    marks = []
    for row in data_list:
        row_marks = []
        for k, v in row.items():
            if k == "Source":
                continue
            v_str = str(v).strip()
            if v_str.isdigit():
                val = float(v_str)
                if 0 <= val <= 200:
                    row_marks.append(val)
        if row_marks:
            marks.extend(row_marks)
            insights["trend"].append(round(sum(row_marks) / len(row_marks), 2))

    if marks:
        insights["highest"] = max(marks)
        insights["lowest"] = min(marks)
        insights["average"] = round(sum(marks) / len(marks), 2)

    return insights


def process_documents(saved_paths, search_name, output_filename, output_format='pdf'):
    """
    Processes multiple file formats (PDF, DOCX, XLSX, CSV, TXT) to find search_name.
    Outputs either a merged+highlighted PDF or an Excel file based on output_format.
    """
    total_matches = 0
    excel_data = []
    all_tags = set()
    matched_pages = []

    for path in saved_paths:
        try:
            ext = os.path.splitext(path)[1].lower()

            if ext == '.pdf':
                matches, pages, data, text_sample = process_pdf(path, search_name, output_format)
                total_matches += matches
                if text_sample:
                    all_tags.update(tag_document(text_sample))
                if output_format == 'pdf' and pages:
                    matched_pages.append((path, pages))
                if output_format == 'excel':
                    excel_data.extend(data)

            elif ext in ['.xlsx', '.xls', '.csv']:
                matches, data = process_excel(path, search_name, ext)
                total_matches += matches
                all_tags.add('Data Table')
                if output_format == 'excel':
                    excel_data.extend(data)

            elif ext == '.docx':
                matches, data, text_sample = process_docx(path, search_name)
                total_matches += matches
                if text_sample:
                    all_tags.update(tag_document(text_sample))
                if output_format == 'excel':
                    excel_data.extend(data)

            elif ext == '.txt':
                matches, data, text_sample = process_txt(path, search_name)
                total_matches += matches
                if text_sample:
                    all_tags.update(tag_document(text_sample))
                if output_format == 'excel':
                    excel_data.extend(data)

        except Exception as e:
            print(f"Error processing {path}: {e}")

    tags_list = list(all_tags) if all_tags else ["Document"]
    summary = generate_summary(tags_list, total_matches)
    insights = extract_insights(excel_data)

    if total_matches == 0:
        return 0, [], "No matches found.", {}

    # --- Build PDF output ---
    if output_format == 'pdf' and matched_pages:
        merged_pdf = fitz.open()
        try:
            for path, pages in matched_pages:
                src_doc = fitz.open(path)
                for p_num in pages:
                    merged_pdf.insert_pdf(src_doc, from_page=p_num, to_page=p_num)
                    # Always reference the last inserted page
                    inserted_page = merged_pdf[len(merged_pdf) - 1]
                    text_instances = inserted_page.search_for(search_name, quads=True)
                    if text_instances:
                        for inst in text_instances:
                            highlight = inserted_page.add_highlight_annot(inst)
                            highlight.update()
                    else:
                        # Fallback: highlight individual words for fuzzy-matched names
                        for word in search_name.split():
                            word_instances = inserted_page.search_for(word, quads=True)
                            for inst in word_instances:
                                highlight = inserted_page.add_highlight_annot(inst)
                                highlight.update()
                src_doc.close()
            merged_pdf.save(output_filename)
        finally:
            merged_pdf.close()

        return total_matches, tags_list, summary, insights

    # --- Build Excel output ---
    elif output_format == 'excel' and excel_data:
        df = pd.DataFrame(excel_data).drop_duplicates()
        df.to_excel(output_filename, index=False)
        return total_matches, tags_list, summary, insights

    return 0, [], "No matches found.", {}


def process_pdf(path, search_name, output_format):
    """
    Scans a PDF for pages matching search_name.
    Returns: (match_count, matched_page_numbers, excel_rows, text_sample)
    """
    doc = fitz.open(path)
    matches = 0
    matched_pages = []
    excel_data = []
    text_sample = ""

    try:
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text("text")

            if page_num == 0:
                text_sample = text[:1000]

            if is_match(search_name, text):
                matches += 1
                matched_pages.append(page_num)

                if output_format == 'excel':
                    lines = [l.strip() for l in text.split('\n') if l.strip()]
                    for line in lines:
                        if is_match(search_name, line):
                            excel_data.append({
                                "Source": os.path.basename(path),
                                "Page": page_num + 1,
                                "Content": line
                            })
    finally:
        doc.close()

    return matches, matched_pages, excel_data, text_sample


def process_excel(path, search_name, ext):
    """Search spreadsheet rows for search_name."""
    matches = 0
    data = []

    if ext == '.csv':
        df = pd.read_csv(path)
        df_str = df.astype(str)
        mask = df_str.apply(
            lambda row: any(is_match(search_name, str(val)) for val in row), axis=1
        )
        matched_df = df[mask]
        matches += len(matched_df)
        for _, row in matched_df.iterrows():
            row_data = {"Source": os.path.basename(path)}
            row_data.update(row.to_dict())
            data.append(row_data)
    else:
        xls = pd.ExcelFile(path)
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=sheet_name)
            df_str = df.astype(str)
            mask = df_str.apply(
                lambda row: any(is_match(search_name, str(val)) for val in row), axis=1
            )
            matched_df = df[mask]
            matches += len(matched_df)
            for _, row in matched_df.iterrows():
                row_data = {"Source": f"{os.path.basename(path)} - {sheet_name}"}
                row_data.update(row.to_dict())
                data.append(row_data)

    return matches, data


def process_docx(path, search_name):
    """Search paragraphs in a DOCX file for search_name."""
    matches = 0
    data = []
    text_sample = ""
    doc = Document(path)

    for i, para in enumerate(doc.paragraphs):
        text = para.text
        if i < 5:
            text_sample += text + " "
        if is_match(search_name, text):
            matches += 1
            data.append({"Source": os.path.basename(path), "Matched Text": text})

    return matches, data, text_sample


def process_txt(path, search_name):
    """Search lines in a TXT file for search_name."""
    matches = 0
    data = []
    text_sample = ""

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
        text_sample = "".join(lines[:10])
        for line in lines:
            if is_match(search_name, line):
                matches += 1
                data.append({"Source": os.path.basename(path), "Matched Text": line.strip()})

    return matches, data, text_sample
