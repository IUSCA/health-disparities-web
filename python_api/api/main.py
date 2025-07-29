import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routers import search, analysis, cohorts, interventions, statistics

app = FastAPI(title="API",
              description="An API to support the front-end of the tauri app", )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins. Use a list of origins to restrict.
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods. You can specify a list if needed.
    allow_headers=["*"],  # Allows all headers. You can specify a list if needed.
)


@app.exception_handler(AssertionError)
def assertion_exception(request: Request, exc: AssertionError):
    return JSONResponse(
        status_code=400,
        content={"message": str(exc)},
    )


@app.get("/health")
def health():
    return {"health": "OK"}


app.include_router(search.router)
app.include_router(analysis.router)
app.include_router(cohorts.router)
app.include_router(interventions.router)
app.include_router(statistics.router)


def start_dev():
    uvicorn.run("api.main:app",
                port=5000,
                log_level="info",
                reload=True,
                reload_dirs=["./api"]
                )


if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=5000)
