FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

RUN pip install poetry==1.8.2

RUN poetry config virtualenvs.create false

WORKDIR /code

COPY ./pyproject.toml ./poetry.lock* ./

RUN poetry install  --no-interaction --no-ansi --no-root

COPY ./app ./

EXPOSE 8080

CMD exec uvicorn main:app --host 0.0.0.0 --port 8000
