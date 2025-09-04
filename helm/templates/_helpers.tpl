{{- define "pgadmin4.fullname" -}}
{{- tpl .Values.fullname . -}}
{{- end -}}

{{- define "pgadmin4.image" -}}
{{- printf "%s/%s:%s" (default .Values.image.registry .Values.global.imageRegistry) .Values.image.repository (default .Chart.AppVersion .Values.image.tag | toString) -}}
{{- end -}}

{{- define "pgadmin4.serviceAccountName" -}}
{{- default (ternary (include "pgadmin4.fullname" .) "default" .Values.serviceAccount.create) .Values.serviceAccount.name -}}
{{- end -}}

{{- define "renderSecurityContext" -}}
{{- $securityContext := omit .securityContext "enabled" -}}
{{- if or (eq .context.Values.global.compatibility.openshift.adaptSecurityContext "force") (and (eq .context.Values.global.compatibility.openshift.adaptSecurityContext "auto") (ternary "true" "" (.context.Capabilities.APIVersions.Has "security.openshift.io/v1"))) -}}
  {{- $securityContext = omit $securityContext "fsGroup" "runAsUser" "runAsGroup" -}}
  {{- if not $securityContext.seLinuxOptions }}
    {{- $securityContext = omit $securityContext "seLinuxOptions" -}}
  {{- end -}}
{{- end -}}
{{- if $securityContext.privileged }}
  {{- $securityContext = omit $securityContext "capabilities" -}}
{{- end -}}
{{- if not .context.Values.global.compatibility.appArmor.enabled }}
  {{- $securityContext = omit $securityContext "appArmorProfile" -}}
{{- end -}}
{{- $securityContext | toYaml -}}
{{- end -}}