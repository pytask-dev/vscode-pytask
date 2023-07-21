import pytask
import sys
import json
import io
import contextlib
import multiprocessing
from multiprocessing.connection import Listener

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

def startServer():
    address = ('localhost', 6000)     # family is deduced to be 'AF_INET'
    listener = Listener(address, authkey=b'secret password')
    while True:
        try:
            conn = listener.accept()
            msg = conn.recv()
        except Exception as e:
            print(e)
            conn.close()
            break
        print(msg, end='', flush=True)
        if msg == 'close':
            conn.close()
            break
    listener.close()

def startPytask(args):

    f = io.StringIO()
    # Intercepts the Pytask CLI Output
    with contextlib.redirect_stdout(f):
        if args[1] == "dry":
            session = pytask.main({"dry_run":True,"check_casing_of_paths" : "false", "editor_url_scheme":"vscode"})
        elif args[1] == "build":
            session = pytask.main({"dry_run":False,"check_casing_of_paths" : "false", "editor_url_scheme":"vscode"})
        elif args[1] == "build_options":
            input = json.loads(args[2])
            options = {}
            for key in input:
                options[key.replace('-','_')] = input[key]
            session = pytask.main(options)
            
    message = f.getvalue()
    return json.dumps(toDict(session,message))
if __name__ == "__main__":
    if sys.argv[1] == "build" or sys.argv[1] == "build_options":
        run = multiprocessing.Process(target=startPytask, args=(sys.argv,))
        server = multiprocessing.Process(target=startServer)
        server.start()
        run.start()
        run.join()
        server.join()
    else:
        print(startPytask(sys.argv))
# Print the JSON to stdout to communicate with the plugin