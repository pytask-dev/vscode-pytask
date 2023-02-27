import pytask
import sys
import json
import networkx as nx
import io
import contextlib

# Converts the important parts from the pytask session into a dict, to then convert them into JSON
def toDict(session: pytask.Session, message: str):
    list = []
    for task in session.tasks:
        for i in session.execution_reports:
            if i.task == task:
                report = str(i.outcome)
        attrs = {"name" : task.base_name, "path" : str(task.path), "report" : report}
        list.append(attrs)
    result = {"message" : message, "tasks" : list}
    return result

f = io.StringIO()
# Intercepts the Pytask CLI Output
with contextlib.redirect_stdout(f):
    session = pytask.main({"command" : sys.argv[1], "check_casing_of_paths" : "false"})
message = f.getvalue()
# Print the JSON to stdout to communicate with the plugin
print(json.dumps(toDict(session,message)))