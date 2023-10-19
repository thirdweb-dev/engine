## Deploying Engine on Google Compute Engine

### Prerequisites

Before you start, make sure you have the following:

- A Google Cloud Platform (GCP) account.
- The `gcloud` CLI tool installed and configured with the appropriate GCP project.
- Docker installed on your local development machine.
- A Postgres Instance Running which can be accessed via the internet. (You can use [Cloud SQL](https://cloud.google.com/sql/docs/postgres/quickstart) for this)

### Step 1: Create a Google Compute Engine VM

1. Open a terminal and use the `gcloud` CLI to create a GCE VM instance:

   ```bash
   gcloud compute instances create your-instance-name \
     --image-family=debian-11 \
     --image-project=debian-cloud \
     --machine-type=n1-standard-2 \
     --boot-disk-size=10GB
   ```

   Replace `your-instance-name` with your desired instance name. You can also adjust the image, machine type, and disk size according to your requirements.

2. SSH into your VM instance:

   ```bash
   gcloud compute ssh your-instance-name
   ```

### Step 2: Install Docker on the VM

1. Update the package manager:

   ```bash
   sudo apt update
   ```

2. Install Docker on the VM:

   ```bash
   sudo apt install docker.io -y
   ```

3. Start the Docker service:

   ```bash
   sudo systemctl start docker
   ```

4. Add your user to the `docker` group (optional, for running Docker commands without `sudo`):

   ```bash
   sudo usermod -aG docker $USER
   ```

5. Log out and back in or run the following to apply group changes:

   ```bash
   exec sudo su -l $USER
   ```

### Step 3: Create an Environment File (env File)

1. On your local development machine, create a text file and name it `env_file.txt`. In this file, define your environment variables in the format `KEY=VALUE`. Check [Setting Up Server](../../../../README.md#setup-environment-variables)

2. Save the `env_file.txt` file.

### Step 4: Pull and Run Your Docker Image with Environment Variables

1. Copy the `env_file.txt` file to your Google Compute Engine VM using the `gcloud compute scp` command. Replace `your-instance-name` and the local path to your env file accordingly:

   ```bash
   gcloud compute scp /path/to/env_file.txt your-instance-name:~/env_file.txt
   ```

2. SSH into your VM instance:

   ```bash
   gcloud compute ssh your-instance-name
   ```

3. Run your Docker container, specifying the environment file using the `--env-file` option:

   ```bash
   docker run -d -p 80:3005 --env-file ~/env_file.txt thirdweb/engine:latest
   ```

The `--env-file` option allows you to pass environment variables to the Docker container from the `env_file.txt` file.

Now, your Docker container running on the Google Compute Engine VM will have access to the environment variables defined in the `env_file.txt` file. You can access these variables within your application as needed.

### Step 5: Access Your Application

1. Find the external IP address of your VM instance in the GCP Console.

2. Open a web browser and navigate to the external IP address with port 80 (e.g., `http://your-instance-ip`).

You can further customize your VM, install additional software, and secure your application as needed for your specific use case.
