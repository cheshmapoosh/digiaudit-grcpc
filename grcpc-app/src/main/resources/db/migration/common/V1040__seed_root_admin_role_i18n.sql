insert into role_i18n (id, role_id, locale, title, description)
select '24000000-0000-0000-0000-000000000001', r.id, 'fa', 'مدیر ریشه', 'نقش پایه با اختیار کامل مدیریت سامانه'
from role r where r.code = 'ROOT_ADMIN';

insert into role_i18n (id, role_id, locale, title, description)
select '24000000-0000-0000-0000-000000000002', r.id, 'en', 'Root Admin', 'Base role with full system administration authority'
from role r where r.code = 'ROOT_ADMIN';
