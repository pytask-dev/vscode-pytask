import pytask
import sys
import json
import io
import contextlib

# Converts the important parts from the pytask session into a dict, to then convert them into JSON
def toDict(session: pytask.Session, message: str):
    list = []
    if session.exit_code == 0 or session.exit_code == 1:
        for report in session.execution_reports:
            attrs = {"name" : report.task.short_name, "path" : str(report.task.path), "report" : str(report.outcome)}
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
    elif sys.argv[1] == "build":
        session = pytask.main({"dry_run":False,"check_casing_of_paths" : "false", "editor_url_scheme":"vscode"})
    elif sys.argv[1] == "build_options":
        input = json.loads(sys.argv[2])
        options = {}
        for key in input:
            options[key.replace('-','_')] = input[key]
        session = pytask.main(options)
        
message = f.getvalue()
# Print the JSON to stdout to communicate with the plugin
print(json.dumps(toDict(session,message)))