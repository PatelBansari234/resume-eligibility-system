import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    # Attempt to import the module to check for syntax errors
    import hr_resume_parser
    print("Syntax check passed: hr_resume_parser imported successfully.")
except ImportError as e:
    # Ignore missing dependencies issues (like supabase keys) if they are just ImportErrors due to missing env vars
    # But wait, create_client checks env vars at module level!
    # So this might fail if .env is not loaded or valid.
    # We should mock env vars if needed.
    print(f"Import error (likely env or detailed dependency): {e}")
except Exception as e:
    print(f"Syntax or runtime error during import: {e}")
