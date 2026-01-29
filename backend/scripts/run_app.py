# import uvicorn
# from pathlib import Path
# from dotenv import load_dotenv
 
 
# def main():
#     load_dotenv()
#     from src.api.main import app
   
#     uvicorn.run(
#         "src.api.main:app",
#         host="0.0.0.0",
#         port=3338,
#         reload=True,
#         app_dir=str(Path(__file__).parent.parent / "src")
#     )
# if __name__ == "__main__":
#     main()