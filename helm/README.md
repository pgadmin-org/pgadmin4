# PgAdmin4 K8S Helm Chart

Its been a struggle to deploy pgadmin4 container on different restricted k8s distributions for example openshift, gke or vanilla k8s pod security standards.  
This helm chart follows best security measures and practices and compatible with all different security contexts and restrictions.  
Further explanation about the security implementation can be read here: https://korenp1.github.io

It is known that not all yaml fields are customizable or tpl'able, open for contributions.

### Installation Example: 
`helm install mypgadmin4 oci://docker.io/dpage/pgadmin4-helm --set ingress.enabled=true`

### Important Values
| Value | Description | Default |
| --------- | ----------- | ------- |
| `containerPort` | Internal PgAdmin4 Port | `8080` |
| `image.registry` | Image registry | `"docker.io"` |
| `image.repository` | Image Repository | `"dpage/pgadmin4"` |
| `image.tag` | Image tag (If empty, will use .Chart.AppVersion) | `""` |
| `auth.email` | Admin Email | `"admin@pgadmin.org"` |
| `auth.password` | Admin password (If both auth.password and auth.existingSecret are empty, the password will be randomly generated) | `""` |
| `auth.existingSecret` | Existing secret name for admin password (If both auth.password and auth.existingSecret are empty, the password will be randomly generated) | `""` |
| `extraEnvVars` | Extra environment variables | `[]` |
| `serverDefinitions.enabled` | Do predefined server definitions should be created | `false` |
| `serverDefinitions.servers` | Server definitions to load | `{}` |
| `preferences.enabled` | Do preferences should be initialized | `false` |
| `preferences.data` | Preferences to load | `{}` |
| `resources.*` | Allocated requests and limits resources | `{"requests": {...}, "limits": {...}}` |
| `persistence.enabled` | PVC resource creation | `false` |
| `service.type` | Service type | `"ClusterIP"` |
| `service.loadBalancerIP` | Load balancer IP (Only if service.type is LoadBalancer) | `""` |
| `ingress.enabled` | Ingress resource creation | `false` |
| `ingress.hostname` | Ingress resource hostname | `"pgadmin4.local"` |