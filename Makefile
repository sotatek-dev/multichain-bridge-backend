deploy-206:
	rsync -avhzL --delete \
				--no-perms --no-owner --no-group \
				--exclude .git \
				--exclude .env \
				--exclude dist \
				--exclude tmp \
				--exclude node_modules \
				--exclude workers \
				--filter=":- .gitignore" \
				. sotatek@192.168.1.206:/var/www/multichain-bridge-backend