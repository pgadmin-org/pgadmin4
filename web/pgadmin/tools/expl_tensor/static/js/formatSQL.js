import url_for from 'sources/url_for';
import getApiInstance from '../../../../static/js/api_instance';

export default async function formatSQL(sql) {
  const api = getApiInstance();
  const url = url_for('expl_tensor.formatSQL');
  const postData = JSON.stringify({
    query_src: sql,
  });
  try {
    const response = await api.post(url, postData);
    const result = response.data;
    let data;

    if (result?.success) {
      if (!result.data) throw new Error('No data returned from formatting API');
      data = JSON.parse(result.data);
    } else if (result?.data?.code === 401) {
      const retryRes = await fetch(result.data.url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: postData,
      });

      if (!retryRes.ok) throw new Error(`HTTP error ${retryRes.status}`);
      data = await retryRes.json();
    } else {
      throw new Error(`${result?.errormsg || 'Unknown error'} info: ${result?.info}`);
    }

    const { btf_query, btf_query_text } = data || {};

    if (btf_query !== btf_query_text) {
      return btf_query_text;
    } else {
      // Server returns identical text in both fields in case of an error
      // In this scenario, we use the local formatter as a fallback
      throw new Error(btf_query_text);
    }

  } catch (err) {
    console.error(err);
    throw err;
  }
};
