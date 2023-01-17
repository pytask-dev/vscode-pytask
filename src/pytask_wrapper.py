import pytask
import sys
import json 


session = pytask.main({"command" : "collect"})
print(session)