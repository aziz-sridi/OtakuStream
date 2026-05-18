const grpc = require('@grpc/grpc-js');
const { db } = require('./db');

function toNotif(doc) {
  return {
    id: doc.id,
    userId: doc.user_id,
    type: doc.type,
    title: doc.title,
    body: doc.body,
    read: !!doc.read,
    createdAt: doc.created_at,
  };
}

module.exports = {
  async GetNotifications(call, cb) {
    try {
      const { userId, limit = 50 } = call.request;
      const instance = await db;
      const docs = await instance.notifications.find({
        selector: { user_id: userId },
        sort: [{ created_at: 'desc' }],
        limit: limit || 50,
      }).exec();
      cb(null, { items: docs.map(toNotif) });
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async MarkAsRead(call, cb) {
    try {
      const { id } = call.request;
      const instance = await db;
      const doc = await instance.notifications.findOne(id).exec();
      if (!doc) return cb({ code: grpc.status.NOT_FOUND, message: 'notification not found' });
      await doc.patch({ read: true });
      cb(null, toNotif(doc));
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async DeleteNotification(call, cb) {
    try {
      const instance = await db;
      const doc = await instance.notifications.findOne(call.request.id).exec();
      if (doc) await doc.remove();
      cb(null, {});
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },
};
