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

{{- define "tpl.preserve.variable" -}}
{{- $obj := . }}
{{- if kindIs "map" $obj }}
  {{- range $k, $v := $obj }}
    {{- if kindIs "string" $v }}
      {{- if regexMatch "^[0-9]+$" $v }}
        {{- $_ := set $obj $k (atoi $v) }}
      {{- else if regexMatch "(?i)^(true|false)$" $v }}
        {{- $_ := set $obj $k (eq (lower $v) "true") }}
      {{- end }}
    {{- else }}
      {{- include "tpl.preserve.variable" $v }}
    {{- end }}
  {{- end }}
{{- else if kindIs "slice" $obj }}
  {{- range $i, $v := $obj }}
    {{- include "tpl.preserve.variable" $v }}
  {{- end }}
{{- end }}
{{- end }}