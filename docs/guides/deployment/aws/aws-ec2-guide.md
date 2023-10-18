## Running Docker Containers on AWS EC2

### Prerequisites

Before you start, make sure you have the following:

- An AWS account.
- Docker installed on your local development machine.
- An SSH key pair for connecting to EC2 instances.
- Familiarity with the AWS Management Console.

### Step 1: Launch an EC2 Instance

1. Go to the AWS Management Console.
2. Navigate to the EC2 dashboard.
3. Click the "Launch Instance" button.
4. Choose an Amazon Machine Image (AMI) that suits your application.
5. Select an instance type based on your resource requirements.
6. Configure the instance details, including the number of instances and network settings.
7. Add storage as needed.
8. Configure security groups to allow traffic to your containers.
9. Review and launch the instance.

### Step 2: SSH into the EC2 Instance

1. Once the EC2 instance is running, SSH into it using your SSH key pair.
   ```shell
   ssh -i /path/to/your-key.pem ec2-user@your-instance-ip
   ```

### Step 3: Install Docker on the EC2 Instance

1. Update the package manager.

   ```shell
   sudo yum update -y
   ```

2. Install Docker.

   ```shell
   sudo amazon-linux-extras install docker
   ```

3. Start the Docker service.

   ```shell
   sudo service docker start
   ```

4. Add your user to the `docker` group (optional, for running Docker commands without `sudo`).

   ```shell
   sudo usermod -a -G docker ec2-user
   ```

5. Log out and back in or run the following to apply group changes.
   ```shell
   exec sudo su -l $USER
   ```

### Step 4: Run Your Docker Container

1. Pull your Docker image from a registry or copy it to the EC2 instance.

2. Run your Docker container.
   ```shell
   docker run -d -p 80:3005 thirdweb/engine:latest
   ```

You can change the port mapping and the image tag as needed.

### Step 5: Access Your Application

1. Find the public IP or DNS name of your EC2 instance in the AWS Console.

2. Open a web browser and navigate to the public IP or DNS with port 80 (e.g., `http://your-instance-ip`).

This guide covers the basic steps to run Docker containers on AWS EC2. You can further customize your setup based on your specific application requirements, including auto-scaling, monitoring, and security configurations.
