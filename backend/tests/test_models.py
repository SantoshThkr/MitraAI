from app.db.models import Conversation, Message, User


def test_conversation_belongs_to_user() -> None:
    foreign_key = next(iter(Conversation.__table__.c.user_id.foreign_keys))

    assert foreign_key.column is User.__table__.c.id
    assert foreign_key.ondelete == "CASCADE"


def test_message_belongs_to_conversation() -> None:
    foreign_key = next(iter(Message.__table__.c.conversation_id.foreign_keys))

    assert foreign_key.column is Conversation.__table__.c.id
    assert foreign_key.ondelete == "CASCADE"


def test_tables_have_uuid_primary_keys_and_timestamps() -> None:
    for model in (User, Conversation, Message):
        table = model.__table__

        assert [column.name for column in table.primary_key] == ["id"]
        assert table.c.id.type.python_type.__name__ == "UUID"
        assert not table.c.created_at.nullable
        assert not table.c.updated_at.nullable
