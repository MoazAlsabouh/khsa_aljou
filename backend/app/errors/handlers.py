from flask import jsonify
from app.extensions import db # تم التعديل: استيراد db
# from .auth.auth import AuthError # تم التعديل: استيراد AuthError

def register_error_handlers(app):
    """
    تسجيل معالجات الأخطاء المخصصة للتطبيق.
    """
    @app.errorhandler(404)
    def not_found_error(error):
        """
        معالج الخطأ 404 (غير موجود).
        """
        return jsonify({'message': 'Resource Not Found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        """
        معالج الخطأ 500 (خطأ خادم داخلي).
        يضمن التراجع عن أي معاملات قاعدة بيانات معلقة.
        """
        db.session.rollback() # التأكد من التراجع عن أي معاملات قاعدة بيانات معلقة
        return jsonify({'message': 'Internal Server Error'}), 500

    # @app.errorhandler(AuthError)
    # def handle_auth_error(ex):
    #     """
    #     معالج الأخطاء المخصصة لنوع AuthError.
    #     """
    #     response = jsonify({
    #         'success': False,
    #         'error': ex.error['error'],
    #         'status_code': ex.status_code
    #     })
    #     response.status_code = ex.status_code
    #     return response

    # يمكنك إضافة المزيد من معالجات الأخطاء هنا (مثل 400, 401, 403)
