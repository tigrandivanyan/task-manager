// Convert a Mongoose document to a plain object with string `id`
export function serialize(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const result = { ...obj, id: obj._id.toString() };
  delete result._id;
  if (result.userId)    result.userId    = result.userId.toString();
  if (result.projectId) result.projectId = result.projectId.toString();
  if (result.taskId)    result.taskId    = result.taskId.toString();
  if (result.__v !== undefined) delete result.__v;
  return result;
}
