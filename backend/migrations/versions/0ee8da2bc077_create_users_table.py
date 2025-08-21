"""create users table

Revision ID: 0ee8da2bc077
Revises: 
Create Date: 2025-08-21 04:09:09.065778

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geometry
from sqlalchemy_utils import EmailType
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = '0ee8da2bc077'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)  # للتحقق من الفهارس الموجودة

    # جدول users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('phone_number', sa.String(length=20), nullable=False),
        sa.Column('email', EmailType(length=255), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('profile_image_url', sa.String(length=255), nullable=True),
        sa.Column('password_hash', sa.Text(), nullable=True),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_banned', sa.Boolean(), nullable=True),
        sa.Column('oauth_provider', sa.String(length=50), nullable=True),
        sa.Column('email_verification_code', sa.String(length=10), nullable=True),
        sa.Column('email_code_expires_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('reset_password_code', sa.String(length=10), nullable=True),
        sa.Column('reset_code_expires_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('phone_number_verified', sa.Boolean(), nullable=True),
        sa.Column('phone_verification_code', sa.String(length=10), nullable=True),
        sa.Column('phone_code_expires_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('associated_restaurant_id', sa.Integer(), nullable=True),
        sa.Column('email_verification_requests_count', sa.Integer(), nullable=False),
        sa.Column('email_verification_requests_locked_until', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('phone_verification_requests_count', sa.Integer(), nullable=False),
        sa.Column('phone_verification_requests_locked_until', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('phone_number')
    )

    # جدول restaurants
    op.create_table(
        'restaurants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('logo_url', sa.String(length=255), nullable=True),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('location', Geometry(geometry_type='POINT', srid=4326), nullable=False),
        sa.Column('delivery_area', Geometry(geometry_type='POLYGON', srid=4326), nullable=True),
        sa.Column('manager_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # إنشاء الفهارس على restaurants إذا لم تكن موجودة
    with op.batch_alter_table('restaurants', schema=None) as batch_op:
        existing_indexes = [idx['name'] for idx in inspector.get_indexes('restaurants')]
        if 'idx_restaurants_delivery_area' not in existing_indexes:
            batch_op.create_index('idx_restaurants_delivery_area', ['delivery_area'], unique=False, postgresql_using='gist')
        if 'idx_restaurants_location' not in existing_indexes:
            batch_op.create_index('idx_restaurants_location', ['location'], unique=False, postgresql_using='gist')

    # جدول menu_items
    op.create_table(
        'menu_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('restaurant_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('removable_ingredients', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # جدول orders
    op.create_table(
        'orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('restaurant_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('total_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('delivery_address', sa.Text(), nullable=False),
        sa.Column('delivery_location', Geometry(geometry_type='POINT', srid=4326), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    # إنشاء فهرس orders إذا لم يكن موجودًا
    with op.batch_alter_table('orders', schema=None) as batch_op:
        existing_indexes = [idx['name'] for idx in inspector.get_indexes('orders')]
        if 'idx_orders_delivery_location' not in existing_indexes:
            batch_op.create_index('idx_orders_delivery_location', ['delivery_location'], unique=False, postgresql_using='gist')

    # جدول restaurant_applications
    op.create_table(
        'restaurant_applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('restaurant_name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('logo_url', sa.String(length=255), nullable=True),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('location_lat', sa.Float(), nullable=False),
        sa.Column('location_lon', sa.Float(), nullable=False),
        sa.Column('delivery_area_geojson', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # جدول sessions
    op.create_table(
        'sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('refresh_token_jti', sa.String(length=36), nullable=False),
        sa.Column('session_version', sa.Integer(), nullable=False),
        sa.Column('revoked', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('last_used_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('refresh_token_jti')
    )

    # جدول user_addresses
    op.create_table(
        'user_addresses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('address_line', sa.Text(), nullable=True),
        sa.Column('location', Geometry(geometry_type='POINT', srid=4326), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('user_addresses', schema=None) as batch_op:
        existing_indexes = [idx['name'] for idx in inspector.get_indexes('user_addresses')]
        if 'idx_user_addresses_location' not in existing_indexes:
            batch_op.create_index('idx_user_addresses_location', ['location'], unique=False, postgresql_using='gist')

    # جدول menu_item_images
    op.create_table(
        'menu_item_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('menu_item_id', sa.Integer(), nullable=False),
        sa.Column('image_url', sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(['menu_item_id'], ['menu_items.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # جدول order_items
    op.create_table(
        'order_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('menu_item_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('price_at_order', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('excluded_ingredients', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['menu_item_id'], ['menu_items.id']),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # جدول payments
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('payment_method', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('transaction_id', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('order_id'),
        sa.UniqueConstraint('transaction_id')
    )

    # جدول ratings
    op.create_table(
        'ratings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('restaurant_rating', sa.SmallInteger(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('order_id')
    )

    # إضافة FK بعد إنشاء الجداول لتجنب حلقة الاعتمادية
    op.create_foreign_key(
        'fk_users_associated_restaurant',
        'users', 'restaurants',
        ['associated_restaurant_id'], ['id']
    )

    op.create_foreign_key(
        'fk_restaurants_manager',
        'restaurants', 'users',
        ['manager_id'], ['id']
    )


def downgrade():
    # العملية العكسية لإزالة جميع الجداول والفهارس
    with op.batch_alter_table('user_addresses', schema=None) as batch_op:
        batch_op.drop_index('idx_user_addresses_location', postgresql_using='gist')
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.drop_index('idx_orders_delivery_location', postgresql_using='gist')
    with op.batch_alter_table('restaurants', schema=None) as batch_op:
        batch_op.drop_index('idx_restaurants_location', postgresql_using='gist')
        batch_op.drop_index('idx_restaurants_delivery_area', postgresql_using='gist')

    op.drop_table('ratings')
    op.drop_table('payments')
    op.drop_table('order_items')
    op.drop_table('menu_item_images')
    op.drop_table('user_addresses')
    op.drop_table('sessions')
    op.drop_table('restaurant_applications')
    op.drop_table('orders')
    op.drop_table('menu_items')
    op.drop_table('users')
    op.drop_table('restaurants')

    # إعادة الجداول القديمة إذا لزم الأمر
    op.create_table('spatial_ref_sys',
        sa.Column('srid', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('auth_name', sa.VARCHAR(length=256), autoincrement=False, nullable=True),
        sa.Column('auth_srid', sa.INTEGER(), autoincrement=False, nullable=True),
        sa.Column('srtext', sa.VARCHAR(length=2048), autoincrement=False, nullable=True),
        sa.Column('proj4text', sa.VARCHAR(length=2048), autoincrement=False, nullable=True),
        sa.CheckConstraint('srid > 0 AND srid <= 998999', name=op.f('spatial_ref_sys_srid_check')),
        sa.PrimaryKeyConstraint('srid', name=op.f('spatial_ref_sys_pkey'))
    )
    op.create_table('layer',
        sa.Column('topology_id', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('layer_id', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('schema_name', sa.VARCHAR(), autoincrement=False, nullable=False),
        sa.Column('table_name', sa.VARCHAR(), autoincrement=False, nullable=False),
        sa.Column('feature_column', sa.VARCHAR(), autoincrement=False, nullable=False),
        sa.Column('feature_type', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('level', sa.INTEGER(), server_default=sa.text('0'), autoincrement=False, nullable=False),
        sa.Column('child_id', sa.INTEGER(), autoincrement=False, nullable=True),
        sa.ForeignKeyConstraint(['topology_id'], ['topology.id'], name=op.f('layer_topology_id_fkey')),
        sa.PrimaryKeyConstraint('topology_id', 'layer_id', name=op.f('layer_pkey')),
        sa.UniqueConstraint('schema_name', 'table_name', 'feature_column', name=op.f('layer_schema_name_table_name_feature_column_key'))
    )
    op.create_table('topology',
        sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column('name', sa.VARCHAR(), autoincrement=False, nullable=False),
        sa.Column('srid', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('precision', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=False),
        sa.Column('hasz', sa.BOOLEAN(), server_default=sa.text('false'), autoincrement=False, nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('topology_pkey')),
        sa.UniqueConstraint('name', name=op.f('topology_name_key'))
    )