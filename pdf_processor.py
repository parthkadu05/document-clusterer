import fitz  # PyMuPDF
import os
import uuid

def process_pdfs(file_paths, search_name, output_dir):
    """
    Searches for 'search_name' across multiple PDFs in 'file_paths'.
    Highlights the name, and extracts only the pages containing it.
    Merges them into a single PDF in 'output_dir'.
    Returns the path to the merged PDF and the total match count.
    """
    total_matches = 0
    merged_doc = fitz.open()

    for path in file_paths:
        try:
            doc = fitz.open(path)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                # Search for the string, ignorecase is true by default for quads but we can be explicit if needed, fitz normally is case insensitive
                # But to be safe, text_instances returns a list of Quad structures.
                # Actually, fitz.Page.search_for() is case-insensitive by default.
                text_instances = page.search_for(search_name, quads=True)
                
                if text_instances:
                    total_matches += len(text_instances)
                    # Add highlights
                    for inst in text_instances:
                        highlight = page.add_highlight_annot(inst)
                        highlight.update()
                    
                    # Insert this page into our merged document
                    merged_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
            doc.close()
        except Exception as e:
            print(f"Error processing {path}: {e}")

    if total_matches > 0:
        filename = f"merged_result_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(output_dir, filename)
        merged_doc.save(output_path)
        merged_doc.close()
        return filename, total_matches
    else:
        merged_doc.close()
        return None, 0
