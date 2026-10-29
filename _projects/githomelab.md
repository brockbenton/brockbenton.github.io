---
layout: project
title: Git Infrastructure with CI/CD Pipeline
description: A self-hosted Git platform with HTTPS, CI/CD, and webhook-driven deploys, built on a repurposed desktop
importance: 5
---

## Overview

A self-hosted Git platform running on an old desktop that I wiped and turned
into an Ubuntu server. It started as a bare Git repo accessed over SSH and grew
into a containerized Gitea stack with HTTPS, CI/CD, and deploys that run on
every push.

I built it to learn how each piece of a dev platform works: containers, reverse
proxies, TLS, CI runners, and webhooks.

## How It Works

**High level.** A developer pushes to Gitea, which sits behind an Nginx reverse
proxy that handles TLS. Gitea Actions runs the CI workflow, and a webhook
notifies a listener on the server, which pulls the new code and redeploys.

**Low level: the push-to-deploy loop.**

1. **Push.** The developer pushes over SSH using an Ed25519 key. UFW only opens
   the ports that are needed.
2. **Proxy.** Nginx terminates TLS 1.2/1.3, redirects HTTP to HTTPS, proxies
   WebSockets, and forwards requests to Gitea on its internal port.
3. **Store.** Gitea and PostgreSQL run as a Docker Compose stack, with data
   stored in Docker volumes.
4. **CI.** Gitea Actions picks up the workflow file, and a self-hosted runner
   executes the job.
5. **Webhook.** Gitea sends a push event to a Python listener, which verifies
   the HMAC-SHA256 signature before processing the payload.
6. **Deploy.** Once the signature checks out, the listener runs a deploy script
   for that branch, which pulls, builds, and restarts the service.

## What I Built

- **Phase 1:** a bare Git repo with a dedicated `git` user, SSH key
  authentication, UFW rules, and terminal Git workflows
- **Phase 2:** a migration to Docker Compose (Gitea and PostgreSQL), an Nginx
  reverse proxy with TLS, local DNS, a Gitea Actions runner, and the webhook
  listener and deploy script

## Stack

- **Infra:** Ubuntu Server, Docker Compose, Nginx, PostgreSQL, UFW
- **Git and CI:** Gitea, Gitea Actions
- **Automation:** Python (webhook listener), Bash (deploy script)
