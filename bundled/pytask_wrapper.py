import pytask
import sys
import json
import networkx as nx
import io
import contextlib

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
with contextlib.redirect_stdout(f):
    session = pytask.main({"command" : sys.argv[1], "check_casing_of_paths" : "false"})
message = f.getvalue()
print(json.dumps(toDict(session,message)))