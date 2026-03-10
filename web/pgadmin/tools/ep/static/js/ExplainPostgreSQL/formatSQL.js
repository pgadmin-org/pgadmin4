import url_for from 'sources/url_for';
import getApiInstance from '../../../../../static/js/api_instance';

export default async function formatSQL(sql) {
  return new Promise((resolve, reject) => {
    const api = getApiInstance();
    api.post(
      url_for('ep.explain_postgresql_format'),
      JSON.stringify({
        query_src: sql,
      }))
      .then((res) => {
        if (res.data?.data) {
          try {
            const {btf_query, btf_query_text} = JSON.parse(res.data.data);
            if (btf_query !== btf_query_text) {
              resolve(btf_query_text);
            } else {
              reject(btf_query_text);
            }
          } catch (err) {
            console.error(err);
            reject(err.message);
          }
        }
      })
      .catch((err) => {
        console.error(err);
        reject(err.message);
      });
  });
};
