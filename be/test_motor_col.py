from app.submodules.drive.documents import Documents
col = Documents.get_motor_collection() if hasattr(Documents, 'get_motor_collection') else None
if not col:
    try:
        col = Documents._document_settings.motor_collection
    except:
        pass
if not col:
    try:
        col = Documents.get_settings().motor_collection
    except:
        pass

print("motor_collection:", col)
print("pymongo:", Documents.get_pymongo_collection())
