# Deploy Second Serving on Render

This guide prepares a hosted judge build: one Node.js web service, one persistent PostgreSQL database, HTTPS, and an isolated fictional dataset. It does not publish a deployment or establish that a URL is working. Verify the final URL before adding it to Devpost.

The application uses Node.js native HTTP, vanilla JavaScript, HTML/CSS, PostgreSQL, and NVIDIA Nemotron through Nebius Token Factory. Create a **Web Service**, rather than a static site.

## 1. Choose services that remain available through judging

Use the same Render region for the web service and PostgreSQL database. Choose service plans deliberately in your Render account; this repository does not authorize charges.

The competition requires judge access until judging ends on **December 15, 2026, at 12:00 pm Pacific Time**. Render's free PostgreSQL database expires **30 days after creation**, so a free database created in October will expire before judging. Use a database plan that remains available throughout judging. Free web services also sleep after 15 minutes without traffic and can take about a minute to wake; an always-running service gives judges a smoother first visit. See [the competition rules](https://nebiusglobalaihackathon.devpost.com/rules) and [Render's free-service limitations](https://render.com/docs/free).

## 2. Create a separate PostgreSQL database

In the [Render Dashboard](https://dashboard.render.com/), choose **New → Postgres**. Give the database a recognizable name such as `second-serving-judges` and select your region and plan.

Keep this database separate from your local development data. Do not upload the local `data/` directory, account records, or a private database dump. The hosted setup can create its own administrator and fictional records.

After the database is available, obtain its **Internal Database URL** for the web service's `DATABASE_URL`. Keep that value in Render's environment settings. Services in the same account and region can use this internal connection. See [Render's PostgreSQL connection guide](https://render.com/docs/postgresql-creating-connecting).

## 3. Configure the web service

Create **New → Web Service** and connect the project repository:

```text
https://github.com/nguyenphu123/nebius-nvidia-devpost
```

Use these settings:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Branch | `main`, after the hosted-deployment changes have been pushed |
| Root directory | Leave blank |
| Build command | `npm ci --omit=dev` |
| Start command | `npm run start:hosted` |
| Node version | Node.js 22 or a compatible supported later version |
| Instances | One |
| Health check path | `/health` |

The bundled local PostgreSQL package is a development dependency. The hosted service uses the separately managed database and does not need that package.

Use the exact public hostname assigned to your service when configuring `PUBLIC_ORIGIN`. For example, if Render assigns `https://second-serving-example.onrender.com`, use that origin without `/login`, a trailing path, query string, or fragment. If your final hostname changes, update `PUBLIC_ORIGIN` before testing the new address.

See [Render's Node deployment guide](https://render.com/docs/deploy-node-express-app) for the repository connection and deployment interface.

## 4. Add runtime environment variables

Set these in Render's **Environment** settings. No committed `.env` file is needed for `start:hosted`.

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PUBLIC_ORIGIN` | The exact `https://…onrender.com` origin for this service |
| `STORAGE_DRIVER` | `postgres` |
| `DATABASE_URL` | The new database's Internal Database URL; secret |
| `NEBIUS_API_KEY` | A valid Nebius Token Factory key; secret |
| `NEBIUS_BASE_URL` | `https://api.tokenfactory.us-central1.nebius.com/v1/` |
| `NEBIUS_MODEL` | `nvidia/nemotron-3-super-120b-a12b` |
| `JUDGE_ADMIN_USERNAME` | A dedicated judge-build administrator username |
| `JUDGE_ADMIN_PASSWORD` | A unique password of 12–200 characters; secret |
| `JUDGE_SEED_DEMO` | `true` to add the fictional judge dataset once |

Let Render supply `PORT`. Do not reuse the local `admin/admin` trial credentials. Give judges the hosted trial credentials in the submission's testing instructions; provider keys and database credentials must remain private.

On a fresh database, the hosted start command applies migrations, creates the initial administrator, adds the labelled fictional dataset when `JUDGE_SEED_DEMO=true`, and then starts the web service. A saved completion marker prevents another fixture seed after the first successful seed, even if users later edit or rename demo records. Later starts preserve accounts and operational progress. Changing the bootstrap password variable does not reset an existing account's password. The fixture seed does not refill stock, repair equipment, reset incidents, or extend deadlines on redeploy. You can remove the two initial `JUDGE_ADMIN_*` variables after the first successful setup; keep the actual account credentials available in the judge testing instructions.

## 5. Verify the deployed build

After Render reports a successful deployment:

1. Open the final HTTPS URL ending in `/login` in a private browser window.
2. Sign in with the dedicated judge account and confirm the three `DEMO` branches appear.
3. Follow [JUDGE-GUIDE.md](JUDGE-GUIDE.md) through a complete prepared-food recovery.
4. Request real **AI advice** once and verify that Nebius responds. If it fails, check credits, key, model access, and the configured endpoint; manual operations remain available.
5. Sign out, sign in again, and verify persisted data. A service restart requires another sign-in because sessions are held in process memory.

`/health` checks that the web process has started; it is not a database or AI-provider availability test. Verify those through the signed-in workflow above.

Keep one application instance for this pilot. Horizontal scaling requires a shared session and rate-limit store before use. Database persistence does not make process-local sessions shared.

## 6. Update the actual Devpost submission

Add the verified HTTPS `/login` address as a **Try it out** link. Keep the source repository as a separate link and retain the demo video in its video field:

```text
Source: https://github.com/nguyenphu123/nebius-nvidia-devpost
Video: https://youtu.be/Gy6WMRaRm2E
```

Include the dedicated judge username, password, and English testing instructions from [JUDGE-GUIDE.md](JUDGE-GUIDE.md) in the submission. Replace all URL/account placeholders before saving. Add these details to the submission form itself; a reply in the organizer's message thread does not update the judged submission.

Use accurate **Built with** tags: `node.js`, `javascript`, `html`, `css`, `postgresql`, `nvidia-nemotron`, and `nebius`. This application does not use Next.js or React.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Render cannot reach the app | Use `start:hosted`, `HOST=0.0.0.0`, and Render's supplied `PORT`. |
| Host or Origin rejected | Match `PUBLIC_ORIGIN` to the exact public HTTPS hostname you opened. |
| Cannot connect to PostgreSQL | Use the managed database's internal URL and the same account/region. Do not use `127.0.0.1` or the local database port. |
| First administrator missing | Check the two `JUDGE_ADMIN_*` variables and the 12–200-character password requirement. |
| Existing password did not change | Bootstrap preserves existing accounts. Use **Team access** while signed in to manage credentials. |
| Dataset conflict or setup failure | Inspect the error category and check that you selected the intended isolated database. Do not delete or reset a database to bypass a conflict. |
| AI unavailable | Check Nebius credits, key, model access, and endpoint. The key is used only on the server. |

Render settings and limits can change. The linked official documentation was checked on October 29, 2026.
