import pytask
import sys
import json
import networkx as nx
import io
import contextlib

def toDict(session: pytask.Session, message: str):
    list = []
    for task in session.tasks:
        attrs = {"name" : task.base_name, "path" : str(task.path)}
        list.append(attrs)
    result = {"message" : message, "tasks" : list}
    return result

f = io.StringIO()
with contextlib.redirect_stdout(f):
    session = pytask.main({"command" : "collect", "check_casing_of_paths" : "false"})
message = f.getvalue()
print(json.dumps(toDict(session,message)))