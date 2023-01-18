import pytask
import sys
import json
import networkx as nx
def toJSON(task: pytask.Task):
    attrs = {"name" : task.base_name, "path" : str(task.path)}
    return json.dumps(attrs)

session = pytask.main({"command" : "collect"})
for task in session.tasks:
    result = toJSON(task)
    print(result)