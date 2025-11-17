---
layout: page
title: Git Infastructure with CI/CD Pipeline
description: A fully-fledged self-hosted Git server with enterprise-grade automation capabilities.
img: 
importance: 1
category:
related_publications: true
---

# Git Infrastructure with Automated CI/CD Pipeline

The goal of this project is to develop a fully-fledged self-hosted Git server with enterprise-grade automation capabilities. By building this infrastructure from scratch, I learned containerization, reverse proxy configuration, CI/CD pipeline design, and event-driven deployment automation.

The project is split into two distinct phases: the first phase in which I create a bare Git repository with terminal workflows and SSH access, and the second phase in which I migrate the bare repository to Gitea and incorporate a reverse proxy, webhooks, and a CI/CD pipeline.

I have wrote the following in a tutorial-based manner in which, if you'd like to, you can follow along and learn as I do! I try to be thorough enough to distill each concept while also keeping it decently simplified for the sake of length. 

If you find any issues with the write up, please feel free to contact me via the methods linked in the footer of the website. 

---

# Phase 1: Bare Repository with SSH Access

## Initial Server Setup

I started out by using Balena Etcher to flash a version of Ubuntu Server that will replace Windows 10 on my desktop.

**After booting up, install essential packages:**
```bash
sudo apt install -y git openssh-server ufw
sudo ufw enable
sudo ufw allow ssh
```

**What each package does:**

- **`git`** - Version control system for managing code repositories
- **`openssh-server`** - Enables remote SSH connections to the server, allowing control from anywhere
- **`ufw`** (Uncomplicated Firewall) - Protects network "ports" (entry points) on the system

**Why a firewall matters:**

Without UFW, all ports are open by default:
- Port 22 (SSH)
- Port 80 (HTTP)
- Port 443 (HTTPS)
- Thousands of others

With UFW enabled, all doors are locked except the ones you explicitly allow. This prevents unauthorized access attempts.

---

## Creating a Dedicated Git User

**Create isolated git user account:**
```bash
sudo adduser --disabled-password --gecos "Git Version Control" git
```

**Why a separate user?**

This isolates all repositories under one account instead of using root (security best practice). Multiple developers can access the same `git` user without sharing root credentials.

---

## SSH Key Authentication

**Generate SSH key pair:**
```bash
ssh-keygen -t ed25519 -C "youremail@email.com"
```

**Breaking down the command:**
- `ssh-keygen` - SSH key generator tool
- `-t ed25519` - Encryption algorithm type (modern, fast, secure)
- `-C "youremail@email.com"` - Label/comment for the key

**How SSH public-key cryptography works:**

SSH uses asymmetric encryption, generating two mathematically linked keys:

1. **Private key** (`id_ed25519`) - Never share, stays on your machine
2. **Public key** (`id_ed25519.pub`) - Can be shared freely

**The mathematical relationship:**
- Data encrypted with the public key can **only** be decrypted by the private key
- Data signed with the private key can **only** be verified by the public key
- The private key **cannot** be derived from the public key

This provides secure, password-less authentication.

---

## Configuring SSH Access

**Switch to the git user and set up SSH directory:**
```bash
sudo su - git
```

**Run the following commands:**
```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Paste your public key here (from `cat ~/.ssh/id_ed25519.pub`)
chmod 600 ~/.ssh/authorized_keys
```

**Understanding file permissions:**

The `chmod` command controls who can read, write, or execute files:
- Read (4)
- Write (2)
- Execute (1)

**`chmod 700 ~/.ssh`** means:
- 7 (owner): read + write + execute = full access
- 0 (group): no access
- 0 (others): no access

**`chmod 600 ~/.ssh/authorized_keys`** means:
- 6 (owner): read + write
- 0 (group): no access
- 0 (others): no access

**Why strict permissions matter:** SSH refuses to work if your keys are readable by others—a security feature ensuring private keys stay private.

---

## Creating the Bare Repository

**Initialize bare repository:**
```bash
sudo su - git
mkdir -p ~/repos
cd ~/repos
git init --bare myproject.git
```

**What is a bare repository?**

A bare repository contains only Git's database—no working files. It acts as a central hub where everyone pushes and pulls code.

---

## Client-Side Workflow

**On your client machine (laptop), configure Git identity:**
```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

**Create a new project:**
```bash
mkdir clientproject
cd clientproject
git init
```

**Create initial files:**
```bash
echo "# My Project" > README.md
echo "print('Hello, World!')" > main.py
```

**Make your first commit:**
```bash
git add .                          # Stage all files
git commit -m "Initial commit"     # Save snapshot
```

**Connect to the server:**
```bash
git remote add origin git@<server-ip>:repos/myproject.git
```

**Understanding the connection string:**
- `git remote` - Manage connections to other repositories
- `add` - Add a new remote connection
- `origin` - Name for this remote (convention)
- `git@<server-ip>:repos/myproject.git` - SSH connection string
  - `git@` - Username to SSH as
  - `<server-ip>` - Server address
  - `repos/myproject.git` - Path (relative to git user's home)

**Push your code:**
```bash
git push -u origin main
```

The `-u` flag sets upstream tracking so future pushes can simply be `git push`.

---

## Complete Development Cycle

**The full workflow from a client machine:**

1. **Edit a file:**
```bash
   echo "print('Updated')" >> main.py
```

2. **Check what changed:**
```bash
   git status        # Shows modified files
   git diff          # Shows exact changes
```

3. **Stage changes:**
```bash
   git add main.py
```

4. **Commit changes:**
```bash
   git commit -m "Updated main.py"
```

5. **Push to server:**
```bash
   git push
```

**Cloning from another machine:**

Anyone with SSH access can now clone the repository:
```bash
git clone git@<server-ip>:repos/myproject.git
```

# Phase 2

In Phase 1, I created a bare Git repository with terminal-based workflows and SSH access only. To advance this project, it needs to be containerized (via Docker), more accessible (with a web UI), and organized (via PostgreSQL).

## Containerization & Gitea UI

### The Problem Docker Solves

Imagine you want to run several applications on your server. Potential problems might include:
- Needing different versions of the same software
- Installing one might break another
- Uninstalling is messy (files are everywhere)
- Moving to a new server means reinstalling everything manually

**The solution:** Docker provides containerized applications that are isolated, portable, and reproducible.

---

### Understanding Containers

**What is a container?**

A container acts as a lightweight virtual machine: it has its own filesystem, network, and processes but shares the host's kernel.

**Container vs Virtual Machine:**
- **Virtual Machine:** Includes full guest OS (heavy, GBs of RAM, slow startup)
- **Container:** Shares host OS kernel (lightweight, MBs of RAM, starts instantly)

**Docker image:** Contains everything needed to run the application—code, runtime, system tools, libraries, and dependencies. Images are like blueprints; containers are running instances.

---

### Installing Docker

**Install Docker Engine and Docker Compose:**
```bash
# Install Docker CE, CLI, containerd, and Compose plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (avoid needing sudo)
sudo usermod -aG docker $USER
```

**Why add user to docker group?**

Without this, you'd need `sudo` for every Docker command. Adding yourself to the `docker` group grants permission to manage containers.

**Note:** Log out and back in for group changes to take effect.

---

### Setting Up Docker Compose

**Create dedicated directory for Gitea:**
```bash
mkdir -p ~/gitea-docker
cd ~/gitea-docker
```

**What is Docker Compose?**

Docker Compose orchestrates multi-container applications. Instead of running individual containers manually, Compose defines how containers work together in a single configuration file.

---

### Creating the Docker Compose File

**Create `docker-compose.yml`:**
```bash
nano docker-compose.yml
```

**This is the configuration I used:**
```yaml
version: "3"

networks:
  gitea:
    external: false

services:
  server:
    image: gitea/gitea:latest
    container_name: gitea
    environment:
      - USER_UID=1000
      - USER_GID=1000
      - GITEA__database__DB_TYPE=postgres
      - GITEA__database__HOST=db:5432
      - GITEA__database__NAME=gitea
      - GITEA__database__USER=gitea
      - GITEA__database__PASSWD=gitea_password
    restart: always
    networks:
      - gitea
    volumes:
      - ./gitea:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "3000:3000"
      - "222:22"
    depends_on:
      - db

  db:
    image: postgres:14
    restart: always
    environment:
      - POSTGRES_USER=gitea
      - POSTGRES_PASSWORD=gitea_password
      - POSTGRES_DB=gitea
    networks:
      - gitea
    volumes:
      - ./postgres:/var/lib/postgresql/data
```
**Why volumes matter:**

Containers are ephemeral—when deleted, all data inside is lost forever. Volumes map directories between host and container, making data persistent.

---

### Starting the Application

**Launch all services:**
```bash
docker compose up -d
```

**What happens:**
1. Reads `docker-compose.yml`
2. Creates the `gitea` network
3. Pulls images from Docker Hub (if not cached)
4. Creates volume directories (`./gitea/` and `./postgres/`)
5. Starts PostgreSQL container (dependency first)
6. Starts Gitea container
7. Detaches (`-d` flag) - runs in background

**Verify containers are running:**
```bash
docker compose ps
```

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/dcompose.png" title="Verify that Docker is running" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

---

### Directory Structure After Launch
```
~/gitea-docker/
├── docker-compose.yml       # Infrastructure definition
├── gitea/                   # Gitea's persistent data
│   ├── git/
│   │   └── repositories/    # Your Git repos live here!
│   ├── gitea/
│   │   └── conf/
│   │       └── app.ini      # Gitea configuration
│   └── data/                # Application data
└── postgres/                # PostgreSQL data
    ├── base/                # Database files
    └── pg_wal/              # Write-ahead logs
```

---

### Managing the Application

**Useful Docker Compose commands:**
```bash
# Stop all services (keeps data)
docker compose down

# Start all services
docker compose up -d

# Restart all services
docker compose restart

# View resource usage
docker stats

# Update to latest images
docker compose pull
docker compose up -d

# Remove everything INCLUDING DATA (dangerous!)
docker compose down -v
```

---

**Next steps:** Configure Gitea through the web interface and add reverse proxy for HTTPS access.

With the containers running, Gitea is now accessible at `http://YOUR_SERVER_IP:3000`. Navigate to this URL in a web browser to begin the initial setup.

**Verify containers are running:**
```bash
docker compose ps
```

**Initial setup wizard:**

The first time accessing Gitea, there will be an installation page. Most of the settings are already pre-configured from the `docker-compose.yml` environment variables. However, there are a few key settings to configure.

**Key settings to configure:**

1. **SSH Server Port:** Change from `22` to `222` (we mapped port 222 to avoid conflicts with system SSH)
2. **Gitea Base URL:** `http://YOUR_SERVER_IP:3000`
3. **Administrator Account:** Create your admin user (username, email, password)

Click "Install Gitea" and the application will initialize the database and create the necessary tables.

**Firewall configuration:**

Open the necessary ports:
```bash
sudo ufw allow 3000/tcp   # Gitea web interface
sudo ufw allow 222/tcp    # Gitea SSH for Git operations
sudo ufw status           # Verify rules
```

**Testing the installation:**

1. Log in with the admin account
2. Create a test repository through the web UI
3. Clone it locally:
```bash
   git clone http://YOUR_SERVER_IP:3000/username/test-repo.git
```

## Reverse Proxy with Nginx

### Understanding Proxy Types

**Forward Proxy (hides the client):**
```
You → Forward Proxy → Internet
     (hides your IP)
```

When you use a forward proxy (like a VPN), it hides your identity. Websites see the proxy's IP address, not yours.

**Reverse Proxy (hides the servers):**
```
You → Reverse Proxy → Backend Servers
      (hides servers)
```

A reverse proxy sits in front of your servers. Users connect to the proxy, and it forwards requests to the appropriate backend service.

---

### The Problem Without a Reverse Proxy

**Current situation:**
```
http://192.168.1.100:3000  → Gitea
```

**Issues:**
- **Ugly URLs:** Must remember IP addresses and port numbers
- **Not secure:** HTTP transmits data in plaintext (passwords visible!)
- **Complex:** Each service needs its own port exposed
- **No encryption:** Sensitive data sent unencrypted over the network
- **Unprofessional:** Port numbers in URLs aren't user-friendly

---

### The Solution: Reverse Proxy Benefits

**With reverse proxy:**
```
https://gitea.homelab.local  → Nginx → localhost:3000 → Gitea
```

**Advantages:**
- **Clean URLs:** `https://gitea.homelab.local` instead of `http://IP:3000`
- **HTTPS encryption:** All traffic encrypted end-to-end
- **Single entry point:** Only ports 80/443 need to be exposed
- **Centralized management:** SSL certificates, authentication, and logging in one place
- **Load balancing:** Distribute traffic across multiple backend servers
- **Caching:** Speed up responses by caching static content
- **Security:** Additional layer between users and applications

---

### Understanding HTTP, HTTPS, and TLS

**HTTP (HyperText Transfer Protocol):**
- Data transmitted in plaintext
- Anyone on the network can intercept and read:
  - Passwords
  - Personal information
  - Session tokens
  - All communication

**HTTPS (HTTP Secure):**
- HTTP + TLS encryption
- All data encrypted between browser and server
- Only you and the server can decrypt the communication
- Encrypted data looks like gibberish to interceptors

**Visual comparison:**
```
HTTP:  username=admin&password=secret123
       ↑ Readable by anyone!

HTTPS: aG5kZjMyM2RzZGZoc2RmaGpzZGY=
       ↑ Encrypted gibberish
```

---

### Installing Nginx

**Install Nginx web server:**
```bash
sudo apt update
sudo apt install -y nginx
```

**Verify installation:**
```bash
sudo systemctl status nginx
```

---

### Generating SSL/TLS Certificate

**Create directory for certificates:**
```bash
sudo mkdir -p /etc/nginx/ssl
```

**Generate self-signed certificate:**
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/gitea.key \
  -out /etc/nginx/ssl/gitea.crt \
  -subj "/C=US/ST=Colorado/L=Arvada/O=HomeLab/CN=gitea.homelab.local"
```

**What gets created:**
- `/etc/nginx/ssl/gitea.key` - Private key (never share!)
- `/etc/nginx/ssl/gitea.crt` - Public certificate

Note that when accessing our Gitea server, there will be a security warning for self-signed certificates. This is not a big deal since this is a home lab.

---

### Configuring Nginx

**Create Nginx site configuration:**
```bash
sudo nano /etc/nginx/sites-available/gitea
```

**This is the configuration I used:**
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name gitea.homelab.local;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name gitea.homelab.local;

    # SSL certificate paths
    ssl_certificate /etc/nginx/ssl/gitea.crt;
    ssl_certificate_key /etc/nginx/ssl/gitea.key;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Increase timeouts for large pushes
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

---

### Enabling the Nginx Configuration

**Create symbolic link to enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/gitea /etc/nginx/sites-enabled/
```

**Test Nginx configuration:**
```bash
sudo nginx -t
```

**Expected output:**
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**If test passes, reload Nginx:**
```bash
sudo systemctl reload nginx
```

**Enable Nginx to start on boot:**
```bash
sudo systemctl enable nginx
```

---

### Configuring DNS Resolution

**The problem:**

`gitea.homelab.local` isn't a real domain. DNS servers don't know about it.

**The solution:**

Use the `/etc/hosts` file to create a local DNS override.

**On the server itself:**
```bash
sudo nano /etc/hosts
```

**Add this line:**
```
127.0.0.1  gitea.homelab.local
```

**On your client machine (laptop):**
```bash
sudo nano /etc/hosts
```

**Add (replace with your server's actual IP):**
```
192.168.1.100  gitea.homelab.local
```

**How it works:**
```
You type: https://gitea.homelab.local
        ↓
OS checks /etc/hosts first
        ↓
OS finds: gitea.homelab.local = 192.168.1.100
        ↓
Browser connects to 192.168.1.100:443
        ↓
Nginx receives request
```

---

### Opening Firewall Ports

**Allow HTTP and HTTPS traffic:**
```bash
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw status          # Verify rules
```

**Why both ports?**
- Port 80: Receives HTTP requests, redirects to HTTPS
- Port 443: Handles all HTTPS traffic

---

### Updating Gitea Configuration

**Tell Gitea it's behind a reverse proxy:**
```bash
nano ~/gitea-docker/gitea/gitea/conf/app.ini
```

**Find or add the `[server]` section:**
```ini
[server]
PROTOCOL = http
DOMAIN = gitea.homelab.local
ROOT_URL = https://gitea.homelab.local/
HTTP_PORT = 3000
```

**Restart Gitea to apply changes:**
```bash
cd ~/gitea-docker
docker compose restart server
```

---

### Complete Architecture

**The full request flow:**
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS (443)
       ↓
┌──────────────────┐
│  Nginx (Port 443)│
│  Reverse Proxy   │
│  - SSL/TLS       │
│  - Headers       │
└──────┬───────────┘
       │ HTTP (3000)
       ↓
┌──────────────────┐      ┌──────────────┐
│  Gitea Container │ ◄──► │ PostgreSQL   │
│  (Port 3000)     │      │ Container    │
└──────────────────┘      └──────────────┘
```

## CI/CD Pipeline via Gitea Actions

### Why CI/CD Matters

To make the setup more advanced and production-ready, implementing CI/CD (Continuous Integration/Continuous Deployment) with Gitea Actions is essential.

**Definitions:**
- **CI (Continuous Integration):** Automatically test and build code whenever changes are pushed
- **CD (Continuous Deployment):** Automatically deploy tested code to production

---

### Traditional vs Automated Workflow

**Traditional manual workflow (error-prone):**
```
1. Developer writes code
2. Developer manually runs tests
3. Developer manually builds the application
4. Developer manually deploys to server
5. Something breaks in production
6. Scramble to fix and redeploy
```

**Automated CI/CD workflow:**
```
1. Developer writes code
2. Developer pushes to Git
        ↓
3. CI/CD automatically:
   - Runs all tests
   - Checks code quality (linting)
   - Builds the application
   - Runs security scans
   - Creates deployment package
        ↓
4. If tests pass:
   - Automatically deploys to staging
   - Runs integration tests
   - Deploys to production
        ↓
5. Code is live, tested, and verified
```

---

### Gitea Actions Architecture

Gitea Actions works similarly to GitHub Actions, using a runner-based system:
```
┌─────────────────────────────────────────┐
│         Gitea Server                    │
│  - Receives git push                    │
│  - Reads .gitea/workflows/*.yml         │
│  - Queues jobs                          │
│  - Displays results in UI               │
└──────────────┬──────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────┐
│      Gitea Actions Runner                │
│  - Polls Gitea for new jobs              │
│  - Pulls required Docker images          │
│  - Starts isolated job containers        │
│  - Executes workflow steps               │
│  - Reports results back to Gitea         │
└──────────────┬───────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────┐
│        Job Container                     │
│  (ubuntu-latest, node:18, python:3.11)   │
│                                          │
│  Runs your workflow steps:               │
│  - Checkout code                         │
│  - Install dependencies                  │
│  - Run tests                             │
│  - Build application                     │
│  - Deploy (if tests pass)                │
└──────────────────────────────────────────┘
```

---

### Enabling Gitea Actions

**Edit Gitea configuration:**
```bash
nano ~/gitea-docker/gitea/gitea/conf/app.ini
```

**Add these sections:**
```ini
[actions]
ENABLED = true

[webhook]
ALLOWED_HOST_LIST = *
```

**Restart Gitea to apply changes:**
```bash
cd ~/gitea-docker
docker compose restart server
```

**Verify Actions is enabled:**
- Log into Gitea web UI
- Go to **Site Administration** then **Actions**
- Should see "Actions" section (not a 404 error)

---

### Setting Up the Gitea Actions Runner

**What is a runner?**

The runner is the service that actually executes your CI/CD jobs. It:
- Polls Gitea for new jobs
- Pulls Docker images for job environments
- Runs workflow steps in isolated containers
- Reports results back to Gitea

**Create runner directory:**
```bash
mkdir -p ~/gitea-runner
```

**Get registration token:**

1. In Gitea web UI, go to **Site Administration**
2. Click **Actions** then **Runners**
3. Click **Create new Runner**
4. Copy the **registration token**

**Create runner configuration file:**
```bash
nano ~/gitea-runner/config.yaml
```

**Paste this configuration:**
```yaml
log:
  level: info

runner:
  name: my-runner
  capacity: 1
  labels:
    - "ubuntu-latest:docker://node:16-bullseye"
    - "ubuntu-22.04:docker://node:16-bullseye"
    - "ubuntu-20.04:docker://node:16-bullseye"

cache:
  enabled: true

container:
  network: "host"
  privileged: false
  options: ""
  valid_volumes: []
  docker_host: ""

host:
  workdir_parent: ""
```

### Starting the Runner

**Run the runner as a Docker container:**
```bash
docker run -d \
  --name gitea-runner \
  --restart always \
  --network host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v ~/gitea-runner:/data \
  -e GITEA_INSTANCE_URL=http://YOUR_SERVER_IP:3000 \
  -e GITEA_RUNNER_REGISTRATION_TOKEN=YOUR_TOKEN_HERE \
  -e GITEA_RUNNER_NAME=my-runner \
  -e CONFIG_FILE=/data/config.yaml \
  gitea/act_runner:latest
```

**Check runner status in Gitea:**
- Go to **Site Administration** then **Actions** then **Runners**
- Should see "my-runner" with a **green dot** (Online)

---

### Creating The First Workflow

**Clone your test repository:**
```bash
git clone http://localhost:3000/admin/test-repo.git
cd test-repo
```

**Create workflow directory:**
```bash
mkdir -p .gitea/workflows
```

**Create workflow file:**
```bash
nano .gitea/workflows/test.yml
```

**Paste this example workflow:**
```yaml
name: CI Pipeline

on:
  push:
    branches:
      - '**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Say hello
        run: echo "Hello from Gitea Actions!"
      
      - name: Show system info
        run: |
          echo "Running on:"
          uname -a
          echo "Current directory:"
          pwd
          echo "Files in repo:"
          ls -la
      
      - name: Success!
        run: echo "✅ Workflow completed successfully!"
```

---

**What `runs-on` does:**

1. Runner pulls `ubuntu-latest` Docker image
2. Starts a fresh Ubuntu container
3. Runs all steps inside that container
4. Destroys container when done

**Clean slate guarantee:** Every run starts from scratch—no leftover files, dependencies, or configuration.

---

### Deploying and Running the Workflow

**Commit and push the workflow:**
```bash
git add .gitea/
git commit -m "Add CI/CD workflow"
git push
```

**What happens next (automatically):**

1. **Git push** sends code to Gitea
2. **Gitea detects** `.gitea/workflows/test.yml`
3. **Gitea queues** a job
4. **Runner picks up** the job
5. **Runner pulls** `ubuntu-latest` Docker image (if not cached)
6. **Runner starts** fresh container
7. **Runner executes** each step:
   - Checkout code
   - Say hello
   - Show system info
   - Success message
8. **Runner reports** results to Gitea
9. **Container destroyed** (cleanup)

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/gactions.png" title="Gitea Actions running" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

---

**Every push now:**
1. Automatically runs tests
2. Checks code quality
3. Reports results immediately
4. All without manual intervention

## Webhooks for Automated Deployment

### What is a Webhook?

A webhook is an HTTP callback that enables real-time, event-driven automation. Instead of constantly checking for changes, webhooks notify your system the instant something happens.

**Traditional polling:**
```
Your App: "Any new data?"
Server: "No"
[Wait 5 seconds]
Your App: "Any new data?"
Server: "No"
[Wait 5 seconds]
Your App: "Any new data?"
Server: "Yes! Here's the data"
```

**Webhook approach (event-driven):**
```
Your App: "Call me at http://myserver:9000 when there's new data"
Server: "OK, registered!"
[Time passes... event occurs]
Server: "New data arrived! POSTing to http://myserver:9000..."
Your App: Receives notification instantly and takes action
```

**Benefits:**
- Real-time (instant notifications)
- Efficient (only called when needed)
- Scalable (one webhook handles millions of events)
- Event-driven architecture

---

### How Webhooks Work in Gitea

**Setup phase:**

1. You configure a webhook URL in Gitea repository settings
2. You specify which events should trigger the webhook (push, pull request, issues, etc.)
3. Gitea stores this configuration

**When an event happens:**
```
Developer: git push
        ↓
Gitea: "Push event detected on main branch"
        ↓
Gitea: "Webhook configured for push events"
        ↓
Gitea: Sends HTTP POST to your webhook URL
       Body: JSON payload with event details
       Header: X-Gitea-Signature (HMAC signature)
        ↓
Your webhook listener: Receives POST request
        ↓
Your webhook listener: Verifies signature (security)
        ↓
Your webhook listener: Parses payload
        ↓
Your webhook listener: Takes action (deploy, notify, etc.)
```

---

### The Webhook Payload

**What Gitea sends:**

When a push event occurs, Gitea sends a JSON payload containing:
```json
{
  "ref": "refs/heads/main",
  "before": "abc123...",
  "after": "def456...",
  "repository": {
    "id": 1,
    "name": "test-repo",
    "full_name": "admin/test-repo",
    "owner": {
      "username": "admin",
      "email": "admin@example.com"
    },
    "html_url": "https://gitea.homelab.local/admin/test-repo"
  },
  "pusher": {
    "username": "admin",
    "email": "admin@example.com"
  },
  "commits": [
    {
      "id": "def456789...",
      "message": "Fix bug in authentication",
      "url": "https://gitea.homelab.local/admin/test-repo/commit/def456",
      "author": {
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "timestamp": "2024-11-12T02:30:45Z",
      "added": ["new_file.py"],
      "removed": [],
      "modified": ["auth.py"]
    }
  ]
}
```

**Rich information available:**
- Who pushed the code
- Which branch was affected
- What files changed (added, modified, deleted)
- Commit messages
- Full commit history
- Repository metadata

---

### Creating the Webhook Listener

**Create webhook listener directory:**
```bash
mkdir -p ~/webhook-listener
cd ~/webhook-listener
```

**Create the webhook handler script:**
```bash
nano webhook_handler.py
```

**Paste this Python webhook listener:**
```python
#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import subprocess
import hmac
import hashlib
from datetime import datetime

SECRET = "my_super_secret_webhook_key"

class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Read the request body
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        # Verify HMAC signature (security!)
        signature = self.headers.get('X-Gitea-Signature')
        if signature:
            expected_sig = hmac.new(
                SECRET.encode(),
                post_data,
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_sig):
                print("❌ Invalid signature! Rejecting webhook.")
                self.send_response(403)
                self.end_headers()
                return
        
        # Parse the JSON payload
        try:
            payload = json.loads(post_data.decode())
        except json.JSONDecodeError:
            print("❌ Invalid JSON payload")
            self.send_response(400)
            self.end_headers()
            return
        
        # Extract information from payload
        repo_name = payload.get('repository', {}).get('name', 'unknown')
        repo_full = payload.get('repository', {}).get('full_name', 'unknown')
        pusher = payload.get('pusher', {}).get('username', 'unknown')
        branch = payload.get('ref', '').split('/')[-1]
        commits = payload.get('commits', [])
        commit_count = len(commits)
        
        # Log the webhook receipt
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"\n{'='*60}")
        print(f"🎣 WEBHOOK RECEIVED at {timestamp}")
        print(f"{'='*60}")
        print(f"📦 Repository: {repo_full}")
        print(f"👤 Pushed by: {pusher}")
        print(f"🌿 Branch: {branch}")
        print(f"📝 Commits: {commit_count}")
        
        if commits:
            print(f"\n💬 Latest commit message:")
            print(f"   {commits[-1].get('message', 'No message')}")
        
        # Branch-specific automation
        if branch == "main":
            print(f"\n🚀 Main branch detected! Running deployment...")
            try:
                result = subprocess.run(
                    ['/home/YOUR_USERNAME/deploy.sh'],
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                print(f"✅ Deployment output:\n{result.stdout}")
                if result.stderr:
                    print(f"⚠️  Deployment warnings:\n{result.stderr}")
            except subprocess.TimeoutExpired:
                print(f"❌ Deployment timed out after 60 seconds")
            except Exception as e:
                print(f"❌ Deployment failed: {e}")
                
        elif branch == "develop":
            print(f"\n🧪 Develop branch detected! Running integration tests...")
            # Add integration test commands here
            
        else:
            print(f"\n📌 Branch '{branch}' - no automated actions configured")
        
        print(f"{'='*60}\n")
        
        # Send successful response back to Gitea
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {"status": "success", "message": "Webhook processed"}
        self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        # Suppress default HTTP request logging
        pass

if __name__ == '__main__':
    PORT = 9000
    server = HTTPServer(('0.0.0.0', PORT), WebhookHandler)
    print(f"🎣 Webhook listener started on port {PORT}")
    print(f"🔒 Using secret: {SECRET}")
    print(f"📡 Listening for webhooks from Gitea...\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down webhook listener...")
        server.shutdown()
```

**Make it executable:**
```bash
chmod +x webhook_handler.py
```

---

### Creating the Deployment Script

**Create deployment script:**
```bash
nano ~/deploy.sh
```

**Paste this example deployment script:**
```bash
#!/bin/bash

echo "======================================"
echo "🚀 DEPLOYMENT STARTED"
echo "======================================"
echo ""

# Pull latest code from repository
echo "📥 Pulling latest code..."
cd ~/test-repo || exit 1
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git pull failed!"
    exit 1
fi

echo ""
echo "🔧 Installing dependencies..."
# Example for different project types:
# Python: pip install -r requirements.txt
# Node.js: npm install
# Go: go mod download
echo "(No dependencies to install for this demo)"

echo ""
echo "🔨 Building application..."
# Example build commands:
# Node.js: npm run build
# Go: go build -o app main.go
# Docker: docker build -t myapp:latest .
echo "(No build step for this demo)"

echo ""
echo "♻️  Restarting services..."
# Example service restarts:
# systemctl restart myapp
# docker-compose restart
# pm2 restart myapp
echo "(No services to restart for this demo)"

echo ""
echo "🧪 Running smoke tests..."
# Example: curl http://localhost:3000/health
echo "(No smoke tests configured for this demo)"

echo ""
echo "======================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "======================================"
```

**Make it executable:**
```bash
chmod +x ~/deploy.sh
```

**What a real deployment script might include:**

1. **Code update:**
```bash
   cd /var/www/myapp
   git pull origin main
```

2. **Dependency installation:**
```bash
   npm install
   pip install -r requirements.txt
   composer install
```

3. **Build step:**
```bash
   npm run build
   docker build -t myapp:latest .
```

4. **Database migrations:**
```bash
   python manage.py migrate
   rails db:migrate
```

5. **Service restart:**
```bash
   systemctl restart myapp
   docker-compose up -d --no-deps --build app
   pm2 restart myapp
```

6. **Health check:**
```bash
   curl -f http://localhost:3000/health || exit 1
```

7. **Notification:**
```bash
   curl -X POST https://slack.com/api/chat.postMessage \
     -d "text=Deployment successful!"
```

---

### Running the Webhook Listener

**Start the webhook listener:**
```bash
cd ~/webhook-listener
python3 webhook_handler.py
```

**Expected output:**
```
🎣 Webhook listener started on port 9000
🔒 Using secret: my_super_secret_webhook_key
📡 Listening for webhooks from Gitea...
```

**The listener is now running and waiting for webhooks!**

**Leave this terminal open** (listener must be running to receive webhooks). Open a new terminal for the next steps.

---

### Configuring the Firewall

**Open port 9000 for incoming webhook requests:**
```bash
sudo ufw allow 9000/tcp
sudo ufw status
```

**Verify the rule was added:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
3000/tcp                   ALLOW       Anywhere
9000/tcp                   ALLOW       Anywhere
```

---

### Configuring the Webhook in Gitea

**In Gitea web UI:**

1. Navigate to your repository (e.g., `test-repo`)
2. Click **Settings** (top-right)
3. Click **Webhooks** (left sidebar)
4. Click **Add Webhook** then **Gitea**

**Configure the webhook:**

**General Settings:**
- **Target URL:** `http://YOUR_SERVER_IP:9000`
  - Replace `YOUR_SERVER_IP` with your server's IP (e.g., `192.168.1.100`)
  - Or use `http://localhost:9000` if testing locally
- **HTTP Method:** `POST`
- **POST Content Type:** `application/json`
- **Secret:** `my_super_secret_webhook_key`
  - Must match the SECRET in your Python script!

**Trigger Events:**
- ✅ **Push events** (checked)
- ⬜ Pull request events (optional)
- ⬜ Issue events (optional)
- ⬜ Repository events (optional)

**Branch Filter:** Leave empty (triggers on all branches)

**Active:** ✅ Checked

5. Click **Add Webhook**

---

### Testing the Webhook

**Test 1: Manual test delivery**

1. In the webhook configuration page, scroll to **Recent Deliveries**
2. Click **Test Delivery** → **Push**
3. Gitea sends a test webhook immediately

**Switch to your webhook listener terminal:**

You should see:
```
============================================================
🎣 WEBHOOK RECEIVED at 2024-11-12 10:30:45
============================================================
📦 Repository: admin/test-repo
👤 Pushed by: admin
🌿 Branch: main
📝 Commits: 1

💬 Latest commit message:
   Test webhook delivery

🚀 Main branch detected! Running deployment...
✅ Deployment output:
======================================
🚀 DEPLOYMENT STARTED
======================================
...
✅ DEPLOYMENT COMPLETE!
============================================================
```

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/webhook.png" title="Webhook running in terminal" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

**Test 2: Real push event**

Make a code change and push:
```bash
cd ~/test-repo
echo "Testing webhooks - $(date)" >> README.md
git add README.md
git commit -m "Test webhook trigger"
git push
```

**Watch your webhook listener terminal:**

- Repository information
- Who pushed
- Branch name
- Commit message
- Deployment execution (if main branch)

---

### Verifying Webhook Deliveries

**In Gitea web UI:**

1. Go to **Repository Settings** then **Webhooks**
2. Click on your webhook
3. Scroll to **Recent Deliveries**

**Each delivery shows:**
- **Timestamp** - When the webhook was sent
- **Response Code** - HTTP status (200 = success, 403 = invalid signature, etc.)
- **Response Body** - What your listener returned
- **Request Headers** - Including `X-Gitea-Signature`
- **Request Body** - Full JSON payload sent

# Project Conclusion

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/fullgitea.png" title="Full Gitea setup" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

## Key Accomplishments

### Phase 1: Foundation
- ✅ Bare Git repository with SSH authentication
- ✅ Public-key cryptography implementation (Ed25519)
- ✅ Dedicated git user for security isolation
- ✅ Firewall configuration (UFW)
- ✅ Remote access via SSH
- ✅ Terminal-based Git workflows

**Skills demonstrated:** Linux system administration, SSH security, version control fundamentals, network security basics

### Phase 2: Production Infrastructure
- ✅ Containerized application stack (Docker + Docker Compose)
- ✅ Multi-container orchestration (Gitea + PostgreSQL)
- ✅ Persistent data storage with Docker volumes
- ✅ Self-hosted Git server with web interface (Gitea)
- ✅ Nginx reverse proxy with SSL/TLS encryption
- ✅ Clean URL routing and HTTPS termination
- ✅ Automated CI/CD pipeline (Gitea Actions)
- ✅ Webhook-driven deployment automation
- ✅ HMAC signature verification for security
- ✅ Branch-specific deployment logic

**Skills demonstrated:** Containerization, database management, reverse proxy configuration, SSL/TLS certificates, CI/CD pipeline design, event-driven architecture, cryptographic security, infrastructure as code

---

My first homelabbing project was a huge success! What started as a simple SSH-access, bare-repo turned into an enterprise-grade production. I have really learned to love the world of DevOps and how intricate homelabbing can be. I hope to continue working on DevOp side projects and continuing to expand my skill set. 

If you are using this as a tutorial in developing your own Git infastructure, I hope this is helpful. Any suggestions and/or feedback is always welcomed. Please refer to my contact list in the footer of the website. 
