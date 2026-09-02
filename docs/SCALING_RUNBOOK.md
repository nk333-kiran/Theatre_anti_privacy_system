# Production Auto-Scaling Runbook

## 1. Auto-Scaling Triggers & Thresholds

| Metric | Scale-Out Threshold (Add Pod/Node) | Scale-In Threshold (Remove Pod/Node) |
| :--- | :--- | :--- |
| **CPU Utilization** | &ge; 70% for 2 minutes | &le; 30% for 10 minutes |
| **Memory RSS** | &ge; 80% for 3 minutes | &le; 40% for 10 minutes |
| **Request Rate** | &ge; 500 req/sec per instance | &le; 100 req/sec per instance |
| **P95 Latency** | &ge; 250ms for 2 minutes | &le; 50ms for 10 minutes |

---

## 2. Horizontal Pod Autoscaler (HPA) Spec

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: antipiracy-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: antipiracy-api
  minReplicas: 2
  maxReplicas: 16
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```
