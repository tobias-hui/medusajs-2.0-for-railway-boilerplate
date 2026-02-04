<p align="center">
  <a href="https://www.medusajs.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
      <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
      <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg" width=100>
    </picture>
  </a>
  <a href="https://railway.app/template/gkU-27?referralCode=-Yg50p">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://railway.app/brand/logo-light.svg">
      <source media="(prefers-color-scheme: light)" srcset="https://railway.app/brand/logo-dark.svg">
      <img alt="Railway logo" src="https://railway.app/brand/logo-light.svg" width=100>
    </picture>
  </a>
</p>

<h2 align="center">
  Prebaked medusajs 2.0 Headless Backend
</h2>
<h4 align="center">
  Backend + postgres + redis + MinIO + MeiliSearch + Cloudflare R2
</h4>
<p align="center">
Headless commerce backend powered by Medusa's modules - ready for any frontend integration.</p>

<h2 align="center">
  Need help?<br>
  <a href="https://funkyton.com/medusajs-2-0-is-finally-here/">Step by step deploy guide, and video instructions</a>
</h2>

<h3 align="center">
  NEW! Looking for medusa B2B? <br>
  <a href="https://github.com/rpuls/medusa-b2b-for-railway/">Checkout the new B2B quickstart for Railway repository</a>
</h3>



## About this boilerplate
This boilerplate is a headless MedusaJS 2.0 backend application. It is a pre-configured, ready-to-deploy solution, modified for seamless deployment on [railway.app](https://railway.app?referralCode=-Yg50p). Use it with any frontend framework of your choice.

Updated: to `version 2.12.1` 🥳

## Deploy with no manual setup in minutes
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/gkU-27?referralCode=-Yg50p)


## Preconfigured 3rd party integrations

- **Cloudflare R2 storage**: Primary file storage option using S3-compatible API (Priority: R2 > MinIO > Local)
- **MinIO file storage**: Replaces local file storage with MinIO cloud storage, automatically creating a 'medusa-media' bucket for your media files. [README](backend/src/modules/minio-file/README.md)
- **Resend email integration** [Watch setup video](https://youtu.be/pbdZm26YDpE?si=LQTHWeZMLD4w3Ahw) - special thanks to [aleciavogel](https://github.com/aleciavogel) for Resend notification service, and react-email implementation! [README](backend/src/modules/email-notifications/README.md)
- **Stripe payment service**: [Watch setup video](https://youtu.be/dcSOpIzc1Og)
- **Meilisearch integration** by [Rokmohar](https://github.com/rokmohar/medusa-plugin-meilisearch): Adds powerful product search capabilities to your store. When deployed on Railway using the template, MeiliSearch is automatically configured. (For non-railway'ers: [Watch setup video](https://youtu.be/hrXcc5MjApI))

# local setup

## Backend
Video instructions: https://youtu.be/PPxenu7IjGM

- `cd backend/`
- `pnpm install` or `npm i`
- Rename `.env.template` ->  `.env`
- To connect to your online database from your local machine, copy the `DATABASE_URL` value auto-generated on Railway and add it to your `.env` file.
  - If connecting to a new database, for example a local one, run `pnpm ib` or `npm run ib` to seed the database.
- `pnpm dev` or `npm run dev`

### requirements
- **postgres database** (Automatic setup when using the Railway template)
- **redis** (Automatic setup when using the Railway template) - fallback to simulated redis.
- **File storage** (Optional): Cloudflare R2 > MinIO > Local storage.
- **Meilisearch** (Automatic setup when using the Railway template)

### commands

`cd backend/`
`npm run ib` or `pnpm ib` will initialize the backend by running migrations and seed the database with required system data.
`npm run dev` or `pnpm dev` will start the backend (and admin dashboard frontend on `localhost:9000/app`) in development mode.
`pnpm build && pnpm start` will compile the project and run from compiled source. This can be useful for reproducing issues on your cloud instance.

## Frontend Integration

This is a headless backend - you can integrate it with any frontend framework:
- Next.js
- React
- Vue
- React Native
- Flutter
- Or any other client that can communicate with REST/GraphQL APIs

The backend exposes APIs at:
- Admin API: `http://localhost:9000/admin`
- Store API: `http://localhost:9000/store`
- Admin Dashboard: `http://localhost:9000/app`

## Useful resources
- How to setup credit card payment with Stripe payment module: https://youtu.be/dcSOpIzc1Og
- https://funkyton.com/medusajs-2-0-is-finally-here/#succuessfully-deployed-whats-next
  
<p align="center">
  <a href="https://funkyton.com/">
    <div style="text-align: center;">
      A template by,
      <br>
      <picture>
        <img alt="FUNKYTON logo" src="https://res-5.cloudinary.com/hczpmiapo/image/upload/q_auto/v1/ghost-blog-images/funkyton-logo.png" width=200>
      </picture>
    </div>
  </a>
</p>
