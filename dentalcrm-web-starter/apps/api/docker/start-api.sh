#!/bin/sh
set -eu

cd /var/www/html

if [ ! -f vendor/autoload.php ] || [ composer.lock -nt vendor/autoload.php ] || [ composer.json -nt vendor/autoload.php ]; then
  composer install --no-interaction --prefer-dist --optimize-autoloader
fi

php artisan config:clear >/dev/null 2>&1 || true
php artisan route:clear >/dev/null 2>&1 || true
php artisan view:clear >/dev/null 2>&1 || true
php artisan storage:link >/dev/null 2>&1 || true
php artisan migrate --force --no-interaction

if [ "${RUN_SEEDERS:-true}" = "true" ]; then
  php artisan db:seed --force --no-interaction
fi

serve_args="--host=0.0.0.0 --port=${PORT:-8000}"
workers="${PHP_CLI_SERVER_WORKERS:-1}"

case "$workers" in
  ''|*[!0-9]*)
    workers=1
    ;;
esac

if [ "$workers" -gt 1 ]; then
  serve_args="$serve_args --no-reload"
fi

# Deliberately expand the argument string so Laravel can receive optional flags.
# shellcheck disable=SC2086
exec php artisan serve $serve_args
