commit:
	make pull
	@git add .
	@git commit -m "$(message)"
	@git push origin "$(branch)"

pull:
	@git pull origin backend

docker-build:
	docker build -t backendtest .

docker-run-test:
	docker run -it backendtest /bin/sh

docker-run:
	docker run backendtest /bin/sh

start:
	python3 -m venv venv
	source venv/bin/activate
	pip install -r requirements.txt
	uvicorn app.main:app --reload
