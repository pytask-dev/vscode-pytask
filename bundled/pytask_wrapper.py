import pytask
import sys
import json
import io
import contextlib

# Converts the important parts from the pytask session into a dict, to then convert them into JSON
def toDict(session: pytask.Session, message: str):
    list = []
    if session.exit_code == 0:
        for task in session.tasks:
            for i in session.execution_reports:
                if i.task == task:
                    report = str(i.outcome)
            attrs = {"name" : task.short_name, "path" : str(task.path), "report" : report}
            list.append(attrs)
        result = {"message" : message, "tasks" : list, "exitcode" : 0}
    else:
        result = {"message" : message, "exitcode" : 1}
    return result

f = io.StringIO()
# Intercepts the Pytask CLI Output
with contextlib.redirect_stdout(f):
    if sys.argv[1] == "dry":
            session = pytask.main({"dry_run":True,"check_casing_of_paths" : "false", "editor_url_scheme":"vscode"})
    else:
        session = pytask.main({"dry_run":False,"check_casing_of_paths" : "false", "editor_url_scheme":"vscode"})
message = f.getvalue()
# Print the JSON to stdout to communicate with the plugin
print(json.dumps(toDict(session,message)))