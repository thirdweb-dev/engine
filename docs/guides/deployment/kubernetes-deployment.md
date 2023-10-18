# Kubernetes Deployment Guide

This guide will walk you through the process of deploying and managing the thirdweb Engine Docker image on a Kubernetes cluster. We will cover how to obtain the manifest file, make necessary changes to the manifest, apply the deployment, delete it, and even perform rollbacks.

## Prerequisites

Before getting started, ensure you have the following prerequisites:

- A running Kubernetes cluster.
- `kubectl` command-line tool configured to access your cluster.
- Docker image `thirdweb/engine` pushed to a container registry accessible from your cluster.

## Getting the Manifest File

To deploy `thirdweb/engine`, you need a Kubernetes manifest file. You can either create one from scratch or modify an existing one. Here's a sample `Deployment` manifest for `thirdweb/engine`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: engine-deployment
spec:
  replicas: 3 # Adjust the number of desired replicas as needed
  selector:
    matchLabels:
      app: engine-deployment
  template:
    metadata:
      labels:
        app: engine-deployment
    spec:
      containers:
        - name: engine
          image: thirdweb/engine:latest # Adjust the tag as needed
          resources:
            requests:
              memory: "128Mi" # Adjust resource requests as needed
              cpu: "250m"
            limits:
              memory: "256Mi" # Adjust resource limits as needed
              cpu: "500m"
          ports:
            - containerPort: 80
          env:
            - name: POSTGRES_CONNECTION_URL
              value: <your-postgres-connection-url>
            - name: THIRDWEB_API_SECRET_KEY
              value: <your-thirdweb-api-secret-key>
```

## Applying the Deployment

Use the `kubectl` apply command to create or update the deployment:

```bash
kubectl apply -f your-manifest-file.yaml
```

Replace `your-manifest-file``.yaml with the path to your modified manifest.

## Deleting the Deployment

To delete the deployment, use the kubectl delete command:

```bash
kubectl delete -f your-manifest-file.yaml
```

Replace `your-manifest-file``.yaml with the path to your modified manifest.

## Performing Rollbacks

To rollback to a previous version of the deployment, use the kubectl rollout undo command:

```bash
kubectl rollout undo deployment/engine-deployment
```

Replace `engine-deployment` with the name of your deployment.

## Next Steps

- Add a kubernetes service to your deployment.
- Add an ingress-route to your service, to allow it be accessible to outside traffic.

## Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/home/)
