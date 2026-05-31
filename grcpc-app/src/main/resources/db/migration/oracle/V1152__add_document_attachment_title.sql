alter table document_attachment add title varchar2(500 char);

update document_attachment
set title = original_file_name
where title is null;

alter table document_attachment modify title varchar2(500 char) not null;
