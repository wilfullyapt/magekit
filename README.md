# Magekit
*Designed to extract and catalog YouTube video clips*

## Run it (not done)
1. Copy `/backend/.env-temp` to `/backend/.env` && update `.env` as you will
2. Compile in Docker
3. Run the Docker

## Dev run
1. run `./run.sh` to spawn one shell running backend and another running frontend

## TODO
- [x] `/auth/signup` and `/auth/login` working, backend and frontend
- [ ] Logout button not working
- [ ] `/` -> `/auth/login` causes token refresh but not redirection to `/dashboard`
- [ ] There should be a failure scenario that deletes the auth and refresh token
- [ ] Time entry `/extract` endpoint should accept milliseconds
- [x] Backend extration working
- [ ] Mobile capable
- [ ] `/vidies` endpoint should poll the backend `/api/videos/status/{extraction_id}` for updates
