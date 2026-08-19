"""
Action registry: allowed actions with requires_auth flag.
Each action has params_schema, impl, requires_approval, requires_auth.
"""
import os
import subprocess
from typing import Dict, Any

ACTION_REGISTRY = {}

def _abs_workspace_path(workspace, rel):
    return os.path.abspath(os.path.normpath(os.path.join(workspace, rel or '.')))

# --- Implementations ---
def _safe_run_git_status(params, workspace):
    repo = params.get('repo', '.')
    repo_path = _abs_workspace_path(workspace, repo)
    if not repo_path.startswith(os.path.abspath(workspace)):
        raise RuntimeError("repo path outside workspace")
    proc = subprocess.run(['git', '-C', repo_path, 'status', '--porcelain'], capture_output=True, text=True, timeout=30)
    return {'exit_code': proc.returncode, 'stdout': proc.stdout, 'stderr': proc.stderr}

def _safe_git_commit_push(params, workspace):
    repo = params.get('repo', '.')
    message = str(params.get('message', '')).strip()
    if not message:
        raise RuntimeError("commit message required")
    repo_path = _abs_workspace_path(workspace, repo)
    if not repo_path.startswith(os.path.abspath(workspace)):
        raise RuntimeError("repo path outside workspace")

    r1 = subprocess.run(['git', '-C', repo_path, 'add', '-A'], capture_output=True, text=True, timeout=30)
    r2 = subprocess.run(['git', '-C', repo_path, 'commit', '-m', message], capture_output=True, text=True, timeout=30)
    r3 = subprocess.run(['git', '-C', repo_path, 'push'], capture_output=True, text=True, timeout=60)
    return {
        'add': {'rc': r1.returncode, 'out': r1.stdout, 'err': r1.stderr},
        'commit': {'rc': r2.returncode, 'out': r2.stdout, 'err': r2.stderr},
        'push': {'rc': r3.returncode, 'out': r3.stdout, 'err': r3.stderr},
    }

def _safe_run_python_script(params, workspace):
    rel_path = params.get('path')
    if not rel_path:
        raise RuntimeError("path parameter required")
    path = _abs_workspace_path(workspace, rel_path)
    if not path.startswith(os.path.abspath(workspace)):
        raise RuntimeError("path outside workspace")
    if not path.endswith('.py'):
        raise RuntimeError("only .py files allowed")
    args = params.get('args', [])
    proc = subprocess.run(['python', path] + list(map(str, args)), capture_output=True, text=True, timeout=120)
    return {'exit_code': proc.returncode, 'stdout': proc.stdout, 'stderr': proc.stderr}

# Placeholder for social post (should be implemented with APIs and safe tokens)
def _safe_post_social_media(params, workspace):
    # Do NOT include real credentials here; implement integration in secure connector modules.
    content = str(params.get('content', ''))
    # For now, we only queue or log the content and return a stubbed response
    return {'status': 'queued', 'message_excerpt': content[:200]}

# Placeholder for send_gmail - requires proper OAuth flow elsewhere
def _safe_send_gmail(params, workspace):
    to = params.get('to')
    subject = params.get('subject', '')
    body = params.get('body', '')
    if not to:
        raise RuntimeError('recipient required')
    # Stub: queue email for sending by a secure connector
    return {'status': 'queued', 'to': to, 'subject': subject}

# Register actions with requires_auth and requires_approval flags
ACTION_REGISTRY['git_status'] = {
    'params_schema': {'repo': str},
    'impl': _safe_run_git_status,
    'requires_approval': False,
    'requires_auth': False
}
ACTION_REGISTRY['git_commit_push'] = {
    'params_schema': {'repo': str, 'message': str},
    'impl': _safe_git_commit_push,
    'requires_approval': True,
    'requires_auth': False
}
ACTION_REGISTRY['run_python_script'] = {
    'params_schema': {'path': str, 'args': list},
    'impl': _safe_run_python_script,
    'requires_approval': True,
    'requires_auth': False
}
ACTION_REGISTRY['post_social_media'] = {
    'params_schema': {'content': str},
    'impl': _safe_post_social_media,
    'requires_approval': True,
    'requires_auth': True
}
ACTION_REGISTRY['send_gmail'] = {
    'params_schema': {'to': str, 'subject': str, 'body': str},
    'impl': _safe_send_gmail,
    'requires_approval': True,
    'requires_auth': True
}

# Helpers

def is_action_allowed(action_name: str) -> bool:
    return action_name in ACTION_REGISTRY


def sanitize_params(action_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
    entry = ACTION_REGISTRY.get(action_name)
    if not entry:
        raise RuntimeError("action not registered")
    schema = entry.get('params_schema', {})
    out = {}
    for k, typ in schema.items():
        if k not in params:
            continue
        v = params[k]
        if typ is str:
            out[k] = str(v)
        elif typ is list:
            if not isinstance(v, list):
                raise RuntimeError(f"param {k} must be list")
            out[k] = v
        else:
            out[k] = v
    return out


def check_sandbox_path(params: Dict[str, Any], base_dir: str):
    def _check_key(key):
        if key in params:
            candidate = os.path.normpath(os.path.join(base_dir, params[key]))
            if not os.path.abspath(candidate).startswith(os.path.abspath(base_dir)):
                raise RuntimeError(f'path {params[key]} escapes workspace')
            if '..' in params[key] or params[key].startswith('/'):
                raise RuntimeError('disallowed path pattern')
    _check_key('path')
    _check_key('repo')
