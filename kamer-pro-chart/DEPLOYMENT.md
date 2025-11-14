# Local Testing Quickstart

Lean checklist for running the kamer-pro-chart chart on Minikube.

## 1. Prerequisites

- Minikube ≥ v1.30 (Docker driver recommended)
- Helm ≥ v3.8
- kubectl matching the Minikube cluster

## 2. Start Minikube

```bash
minikube start
kubectl config use-context minikube
```

## 3. Prepare Secrets

Passwords can be any non-empty string; reuse for convenience.

```bash
kubectl create namespace local
kubectl create secret generic kamer-pro-local-backend -n local \
  --from-literal=jwtSecret=your-jwt-secret
```

## 4. Deploy

```bash
helm dependency update ./kamer-pro-chart
helm install kamer-pro-local ./kamer-pro-chart -n local -f ./kamer-pro-chart/values-local.yaml
```

## 5. Verify Pods

```bash
kubectl get pods -n local
```

Expect three components to reach `Running`:

- `kamer-pro-local-postgresql-0`
- `kamer-pro-local-backend-*`
- `kamer-pro-local-frontend-*`

## 6. Access the Application

### Backend

```bash
kubectl port-forward -n local svc/kamer-pro-local-backend-service 8000:8000
curl http://localhost:8000/health
```

### Frontend

```bash
export NODE_PORT=$(kubectl get --namespace local -o jsonpath="{.spec.ports[0].nodePort}" services kamer-pro-local-frontend-service)
export NODE_IP=$(kubectl get nodes --namespace local -o jsonpath="{.items[0].status.addresses[0].address}")
echo "http://$NODE_IP:$NODE_PORT"
```

## 7. Tear Down

```bash
helm uninstall kamer-pro-local -n local
kubectl delete namespace local
minikube stop
```

## Notes

- `values-local.yaml` only overrides what differs from production defaults (NodePorts, disabled ingress/persistence, lighter resources).
- If pods fail with `CreateContainerConfigError`, check that the `kamer-pro-local-backend` secret exists in the `local` namespace.