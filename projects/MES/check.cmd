docker build -t mdh-docs .
docker run --rm -p 5050:5050 mdh-docs
# открыть http://localhost:5050