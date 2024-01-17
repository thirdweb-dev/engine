## Deploying on Google Kubernetes Engine (GKE) Guide

### Prerequisites

Before you begin, ensure you have the following:

- A Google Cloud Platform (GCP) account.
- The `gcloud` CLI tool installed and configured with the appropriate GCP project.
- Docker installed on your local development machine.
- Postgres Instance Running on either the cluster or Cloud SQL which can be accessed via the internet.

### Step 1: Create a GKE Cluster

1. Set your Compute Engine region:

   ```bash
   gcloud config set compute/region REGION
   ```

2. Create a GKE cluster:

   ```bash
   gcloud container clusters create-auto your-cluster-name
   ```

   Replace `your-cluster-name` with your desired cluster name.

   It takes a few minutes for your GKE cluster to be created and health-checked

### Step 2: Deploy Your Docker Image

1. Ensure that you are connected to the GKE cluster:

   ```bash
   gcloud container clusters get-credentials your-cluster-name --region your-region
   ```

   Replace `your-cluster-name` and `your-region` with your specific details.

2. Create a Kubernetes Deployment YAML file, for example, `deployment.yaml`, to define your Docker container:

   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: engine-deployment
     labels:
       app: engine
   spec:
     environment:
       - name: POSTGRES_CONNECTION_URL
         value: <your_postgres_connection_url>
       - name: THIRDWEB_API_SECRET_KEU
         value: <your_thirdweb_api_secret_key>
     ports:
       - port: 80
         protocol: TCP
         targetPort: 3005
     replicas: 3 # Number of pods to run
     selector:
       matchLabels:
         app: engine
     template:
       metadata:
         labels:
           app: engine
       spec:
         containers:
           - name: engine
             image: thirdweb/engine:latest # You can change the image tag as needed.
   ```

3. Apply the Deployment YAML to create the deployment:

   ```bash
   kubectl apply -f deployment.yaml
   ```

### Step 3: Expose Your Service (Optional)

If you want to expose your deployment to the internet, you can create a Kubernetes Service of type LoadBalancer or NodePort. Here's an example of a LoadBalancer Service:

1. Create a Kubernetes Service YAML file, for example, `service.yaml`:

   ```yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: engine-service
   spec:
     selector:
       app: engine
     ports:
       - protocol: TCP
         port: 80
         targetPort: 3005
     type: LoadBalancer
   ```

2. Apply the Service YAML to create the service:

   ```bash
   kubectl apply -f service.yaml
   ```

Google Cloud will provision a load balancer and assign it a public IP address.

### Step 4: Access Your Application

1. Get the external IP address of your LoadBalancer service:

   ```bash
   kubectl get svc your-service-name
   ```

2. Open a web browser and navigate to the external IP address to access your application.

You can further customize your deployment, set up auto-scaling, and integrate with other GCP services as needed for your application.
