# PgAdmin4 K8S Helm Chart

Its been a struggle to deploy pgadmin4 container on different restricted k8s distributions for example openshift, gke or vanilla k8s pod security standards.  
This helm chart follows best security measures and practices and compatible with all different security contexts and restrictions.  
Further explanation about the security implementation can be read here: https://korenp1.github.io  

The helm chart also implements most pgadmin4 features, for instance predefined server definitions or preferences.

The majority of features and values are covered in the helm chart but always can be more customable or tpl'able, open for contributions.

### Installation Example: 
`helm install mypgadmin4 oci://docker.io/dpage/pgadmin4-helm --set ingress.enabled=true`

### Important Values
| Value | Description | Default |
| --------- | ----------- | ------- |
| `containerPort` | Internal PgAdmin4 Port | `5050` |
| `image.registry` | Image registry | `"docker.io"` |
| `image.repository` | Image Repository | `"dpage/pgadmin4"` |
| `image.tag` | Image tag (If empty, will use .Chart.AppVersion) | `""` |
| `auth.email` | Admin Email | `"admin@pgadmin.org"` |
| `auth.password` | Admin password (If both auth.password and auth.existingSecret are empty, the password will be randomly generated) | `""` |
| `auth.existingSecret` | Existing secret name for admin password (If both auth.password and auth.existingSecret are empty, the password will be randomly generated) | `""` |
| `extraEnvVars` | Extra environment variables | `[]` |
| `config_local.enabled` | Whether to mount config_local.py file | `false` |
| `config_local.data` | config_local.py configuration content | `""` |
| `config_local.existingSecret` | Existing secret name containing config_local.py file | `""` |
| `serverDefinitions.enabled` | Whether to mount servers.json | `false` |
| `serverDefinitions.data` | Server definitions to import | `{}` |
| `preferences.enabled` | Whether to mount preferences.json | `false` |
| `preferences.data` | Preferences to load | `{}` |
| `resources.*` | Allocated requests and limits resources | `{"requests": {...}, "limits": {...}}` |
| `persistence.enabled` | PVC resource creation | `false` |
| `service.type` | Service type | `"ClusterIP"` |
| `service.loadBalancerIP` | Load balancer IP (Only if service.type is LoadBalancer) | `""` |
| `ingress.enabled` | Ingress resource creation | `false` |
| `ingress.hostname` | Ingress resource hostname | `"pgadmin4.local"` |