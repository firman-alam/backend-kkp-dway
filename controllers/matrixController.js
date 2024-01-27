const pool = require('../config/dbConfig')
const { getUserIdFromToken } = require('./userController')

const GetAllNilai = async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    // Fetch all data from data_penilaian_header
    const [headerResults] = await pool.promise().query(
      `
        SELECT
          p.id_pegawai,
          p.nama AS pegawai_nama,
          p.nik,
          h.tahun,
          h.id_penilaian
        FROM
          pegawai p
        JOIN
          data_penilaian_header h ON p.id_pegawai = h.id_pegawai
        WHERE
          h.created_by = ?;
      `,
      [userId]
    )

    // Check if any results were found
    if (headerResults.length === 0) {
      return res.status(404).send('No data found')
    }

    const responseData = []

    // Iterate through each header record
    for (const headerData of headerResults) {
      // Fetch details from data_penilaian_detail for each header record
      const [detailsResults] = await pool.promise().query(
        `
          SELECT
            d.id_kriteria,
            d.nilai,
            k.nama AS kriteria_nama,
            k.code
          FROM
            data_penilaian_detail d
          JOIN
            kriteria k ON d.id_kriteria = k.id_kriteria
          WHERE
            d.id_penilaian_detail = ?;
        `,
        [headerData.id_penilaian]
      )

      // Combine header and details data
      const result = {
        id_pegawai: headerData.id_pegawai,
        nama: headerData.pegawai_nama,
        nik: headerData.nik,
        tahun: headerData.tahun,
        id_penilaian: headerData.id_penilaian,
        details: detailsResults,
      }

      // Push the combined data to the response array
      responseData.push(result)
    }

    // Send the JSON response
    res.json(responseData)
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).send('Internal Server Error')
  }
}

const GetNilai = async (req, res) => {
  const nilaiId = req.params.id

  try {
    // Fetch data from data_penilaian_header
    const [headerResults] = await pool.promise().query(
      `
      SELECT
        p.id_pegawai,
        p.nama AS pegawai_nama,
        h.tahun,
        h.id_penilaian
      FROM
        pegawai p
      JOIN
        data_penilaian_header h ON p.id_pegawai = h.id_pegawai
      WHERE
        h.id_penilaian = ?;
    `,
      [nilaiId]
    )

    // Check if any results were found
    if (headerResults.length === 0) {
      await connection.end()
      return res.status(404).send('Data not found')
    }

    const headerData = headerResults[0]

    // Fetch details from data_penilaian_detail
    const [detailsResults] = await pool.promise().query(
      `
      SELECT
        d.id_kriteria,
        d.nilai,
        k.nama AS kriteria_nama,
        k.code
      FROM
        data_penilaian_detail d
      JOIN
        kriteria k ON d.id_kriteria = k.id_kriteria
      WHERE
        d.id_penilaian_detail = ?;
    `,
      [nilaiId]
    )

    // Combine header and details data
    const responseData = {
      id_pegawai: headerData.id_pegawai,
      nama: headerData.pegawai_nama,
      tahun: headerData.tahun,
      id_penilaian: headerData.id_penilaian,
      details: detailsResults,
    }

    // Send the JSON response
    res.json(responseData)
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).send('Internal Server Error')
  }
}

const checkAlternatifExists = async (alternatif) => {
  const [result] = await pool
    .promise()
    .query(
      'SELECT COUNT(*) as count FROM matriks_penilaian_header WHERE alternatif = ?',
      [alternatif]
    )

  return result[0].count > 0
}

const AddNilai = async (req, res) => {
  const { id_pegawai, tahun, details } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    // Simpan data ke tabel data_penilaian_header table
    const [headerResult] = await pool
      .promise()
      .query(
        'INSERT INTO data_penilaian_header (id_pegawai, tahun, created_by, created_date) VALUES (?, ?, ?, NOW())',
        [id_pegawai, tahun, userId]
      )

    const idPenilaian = headerResult.insertId

    // Simpan data ke table data_penilaian_detail table
    const detailQuery =
      'INSERT INTO data_penilaian_detail (id_penilaian_detail, id_kriteria, nilai, created_by, created_date) VALUES (?, ?, ?, ?, NOW())'

    for (const [id_kriteria, nilai] of Object.entries(details)) {
      const detailValues = [idPenilaian, id_kriteria, nilai, userId]

      await pool.promise().query(detailQuery, detailValues)
    }

    // Membuat Alternatif
    let alternatif = 'A1'
    let counter = 1

    while (await checkAlternatifExists(alternatif)) {
      counter++
      alternatif = `A${counter}`
    }

    // Simpan data ke tabel matriks penilaian header
    await pool
      .promise()
      .query(
        'INSERT INTO matriks_penilaian_header (id_pegawai, id_matriks, alternatif, created_by, created_date) VALUES (?, ?, ?, ?, NOW())',
        [id_pegawai, idPenilaian, alternatif, userId]
      )

    // Get data dari tabel kriteria
    const [criteriaRows] = await pool.promise().query('SELECT * FROM kriteria WHERE created_by = ?', [userId])

    // Get data dari tabel data_penilaian_detail
    const [nilaiDetailRows] = await pool
    .promise()
    .query('SELECT * FROM data_penilaian_detail WHERE created_by = ?', [
      userId,
    ])
    
    // Get data dari tabel matriks_penilaian_detail
    const [matrikDetailRows] = await pool
      .promise()
      .query('SELECT * FROM matriks_penilaian_detail WHERE created_by = ?', [
        userId,
      ])

    // Jika data table matriks penilain detail isinya 0
    if (matrikDetailRows.length == 0) {
      for (const [id_kriteria, nilai] of Object.entries(details)) {
        // Check for detail id kriteria same as kriteria id kriteria
        const matchingCriteria = criteriaRows.find(
          (criteria) => criteria.id_kriteria == id_kriteria
        )

        // tambah data ke matriks penilaian detail
        await addDataToMatriksDetail(
          idPenilaian,
          id_kriteria,
          nilai,
          matchingCriteria,
          nilaiDetailRows,
          userId
        )
      }
// get data perhitungan yang sudah disimpan di tabel matriks penilain detail
      const allDetailRows = await pool
        .promise()
        .query(
          'SELECT preferensi FROM matriks_penilaian_detail WHERE id_matriks_detail = ?',
          [idPenilaian]
        )

      // Kalkulasi jumlah nilai preferensi
      const totalPreferensi = allDetailRows[0].reduce(
        (sum, row) => sum + row.preferensi,
        0
      )

      // Update the total field in matriks_penilaian_header
      await pool
        .promise()
        .query(
          'UPDATE matriks_penilaian_header SET total = ? WHERE id_matriks = ?',
          [totalPreferensi, idPenilaian]
        )
    } else {
      // Jika data table matriks penilaian detail lebih dari 0
      for (const [id_kriteria, nilai] of Object.entries(details)) {
        // Check for detail id kriteria same as kriteria id kriteria
        const matchingCriteria = criteriaRows.find(
          (criteria) => criteria.id_kriteria == id_kriteria
        )

        await addDataToMatriksDetail(
          idPenilaian,
          id_kriteria,
          nilai,
          matchingCriteria,
          nilaiDetailRows,
          userId
        )
      }

      const [nilaiDetails] = await pool
        .promise()
        .query('SELECT * FROM data_penilaian_detail WHERE created_by = ?', [
          userId,
        ])

      const updatePromises = nilaiDetails.map(async (m) => {
        const matchingCriteria = criteriaRows.find(
          (criteria) => criteria.id_kriteria == m.id_kriteria
        )

        await updateDataMatriksDetail(
          m.id_penilaian_detail,
          m.id_kriteria,
          m.nilai,
          nilaiDetails,
          matchingCriteria,
          userId
        )
      })

      // Wait for all promises to complete before moving on
      await Promise.all(updatePromises)


      const [matrikDetails] = await pool
        .promise()
        .query('SELECT * FROM matriks_penilaian_detail WHERE created_by = ?', [
          userId,
        ])

      for (const m of matrikDetails) {
        // Calculate the sum of preferensi values for the specific id_penilaian
        const totalPreferensi = matrikDetails
          .filter((row) => row.id_matriks_detail == m.id_matriks_detail)
          .reduce((sum, row) => sum + row.preferensi, 0)

        console.log('total', totalPreferensi)

        // Update the total field in matriks_penilaian_header
        await pool
          .promise()
          .query(
            'UPDATE matriks_penilaian_header SET total = ? WHERE id_matriks = ?',
            [totalPreferensi, m.id_matriks_detail]
          )
      }
    }

    res.status(200).json({ message: 'Data inserted successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const addDataToMatriksDetail = async (
  idPenilaian,
  id_kriteria,
  nilai,
  matchingCriteria,
  nilaiDetailRows,
  userId
) => {
  const addMatriksDetailQuery =
    'INSERT INTO matriks_penilaian_detail (id_matriks_detail, id_kriteria, nilai, preferensi, created_by, created_date) VALUES (?, ?, ?, ?, ?, NOW())'

  if (matchingCriteria) {
    let normalizedValue
    let preferensi

    if (matchingCriteria.tipe === 'benefit') {
      const rows = nilaiDetailRows
        .filter((row) => row.id_kriteria == id_kriteria)
        .map((row) => row.nilai)

      const highestValue = Math.max(...rows)

      // Divide detail nilai with highest nilai from matriks_penilaian_detail
      normalizedValue =
        nilaiDetailRows.length === 0 ? nilai / nilai : nilai / highestValue
    } else if (matchingCriteria.tipe === 'cost') {
      // If type is cost, get lowest nilai in matriks_penilaian_detail with the same id kriteria
      const rows = nilaiDetailRows
        .filter((row) => row.id_kriteria == id_kriteria)
        .map((row) => row.nilai)

      const lowestCost = Math.min(...rows)

      // Divide lowest nilai from matriks_penilaian_detail with detail nilai
      normalizedValue =
        matriksDetailRows.length === 0
          ? nilai / nilai
          : lowestCost !== 0
          ? lowestCost / nilai
          : 0
    }

    preferensi = normalizedValue * matchingCriteria.bobot

    // Add data to matriks_penilaian_detail
    await pool
      .promise()
      .query(addMatriksDetailQuery, [
        idPenilaian,
        id_kriteria,
        normalizedValue,
        preferensi,
        userId,
      ])
  }
}

const updateDataMatriksDetail = async (
  id_matriks,
  id_kriteria,
  nilai,
  nilaiDetails,
  matchingCriteria,
  userId
) => {
  if (!matchingCriteria) {
    return // No matching criteria, exit early
  }

  let normalizedValue
  let preferensi

  if (matchingCriteria.tipe === 'benefit') {
    const rows = nilaiDetails
      .filter((row) => row.id_kriteria == id_kriteria)
      .map((row) => row.nilai)

    const highestValue = Math.max(...rows)

    normalizedValue = nilai / highestValue
  } else if (matchingCriteria.tipe === 'cost') {
    const rows = nilaiDetails
      .filter((row) => row.id_kriteria == id_kriteria)
      .map((row) => row.nilai)

    const lowestCost = Math.min(...rows)

    normalizedValue = lowestCost / nilai
  }

  preferensi = normalizedValue * matchingCriteria.bobot

  const updateMatriksDetailQuery =
    'UPDATE matriks_penilaian_detail SET nilai = ?, preferensi = ?, last_modified_by = ?, last_modified_date = NOW() WHERE id_matriks_detail = ? AND id_kriteria = ?'

  // Add data to matriks_penilaian_detail
  await pool
    .promise()
    .query(updateMatriksDetailQuery, [
      normalizedValue,
      preferensi,
      userId,
      id_matriks,
      id_kriteria,
    ])
}

const EditNilai = async (req, res) => {
  const { id_pegawai, tahun, details, id_penilaian } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    // Insert into data_penilaian_header table
    await pool
      .promise()
      .query(
        'UPDATE data_penilaian_header SET id_pegawai = ?, tahun = ?, last_modified_by = ?, last_modified_date = NOW() WHERE id_penilaian = ?',
        [id_pegawai, tahun, userId, id_penilaian]
      )

    await pool
      .promise()
      .query(
        'DELETE FROM data_penilaian_detail WHERE id_penilaian_detail = ?',
        [id_penilaian]
      )

    // Insert into data_penilaian_detail table
    const detailQuery =
      'INSERT INTO data_penilaian_detail (id_penilaian_detail, id_kriteria, nilai, created_by, created_date) VALUES (?, ?, ?, ?, NOW())'

    for (const [id_kriteria, nilai] of Object.entries(details)) {
      const detailValues = [id_penilaian, id_kriteria, nilai, userId]

      await pool.promise().query(detailQuery, detailValues)
    }

    await pool
      .promise()
      .query(
        'DELETE FROM matriks_penilaian_detail WHERE id_matriks_detail = ?',
        [id_penilaian]
      )

    // Get data from criteria table
    const [criteriaRows] = await pool.promise().query('SELECT * FROM kriteria')

    // Get data from matriks_penilaian_detail table
    const [nilaiDetailRows] = await pool
      .promise()
      .query('SELECT * FROM data_penilaian_detail WHERE created_by = ?', [
        userId,
      ])

    const [matrikDetailRows] = await pool
      .promise()
      .query('SELECT * FROM matriks_penilaian_detail WHERE created_by = ?', [
        userId,
      ])

    if (matrikDetailRows.length == 0) {
      for (const [id_kriteria, nilai] of Object.entries(details)) {
        // Check for detail id kriteria same as kriteria id kriteria
        const matchingCriteria = criteriaRows.find(
          (criteria) => criteria.id_kriteria == id_kriteria
        )

        await addDataToMatriksDetail(
          id_penilaian,
          id_kriteria,
          nilai,
          matchingCriteria,
          nilaiDetailRows,
          userId
        )
      }

      const allDetailRows = await pool
        .promise()
        .query(
          'SELECT preferensi FROM matriks_penilaian_detail WHERE id_matriks_detail = ?',
          [id_penilaian]
        )

      // Calculate the sum of preferensi values
      const totalPreferensi = allDetailRows[0].reduce(
        (sum, row) => sum + row.preferensi,
        0
      )

      // Update the total field in matriks_penilaian_header
      await pool
        .promise()
        .query(
          'UPDATE matriks_penilaian_header SET total = ? WHERE id_matriks = ?',
          [totalPreferensi, id_penilaian]
        )
    } else {
      for (const [id_kriteria, nilai] of Object.entries(details)) {
        // Check for detail id kriteria same as kriteria id kriteria
        const matchingCriteria = criteriaRows.find(
          (criteria) => criteria.id_kriteria == id_kriteria
        )

        await addDataToMatriksDetail(
          id_penilaian,
          id_kriteria,
          nilai,
          matchingCriteria,
          nilaiDetailRows,
          userId
        )
      }

      const [nilaiDetails] = await pool
        .promise()
        .query('SELECT * FROM data_penilaian_detail WHERE created_by = ?', [
          userId,
        ])

      const updatePromises = nilaiDetails.map(async (m) => {
        const matchingCriteria = criteriaRows.find(
          (criteria) => criteria.id_kriteria == m.id_kriteria
        )

        await updateDataMatriksDetail(
          m.id_penilaian_detail,
          m.id_kriteria,
          m.nilai,
          nilaiDetails,
          matchingCriteria,
          userId
        )
      })

      // Wait for all promises to complete before moving on
      await Promise.all(updatePromises)

      console.log('ok')

      const [matrikDetails] = await pool
        .promise()
        .query('SELECT * FROM matriks_penilaian_detail WHERE created_by = ?', [
          userId,
        ])

      console.log('new matriks', matrikDetails)

      for (const m of matrikDetails) {
        // Calculate the sum of preferensi values for the specific id_penilaian
        const totalPreferensi = matrikDetails
          .filter((row) => row.id_penilaian === m.id_penilaian)
          .reduce((sum, row) => sum + row.preferensi, 0)

        console.log('total', totalPreferensi)

        // Update the total field in matriks_penilaian_header
        await pool
          .promise()
          .query(
            'UPDATE matriks_penilaian_header SET total = ? WHERE id_matriks = ?',
            [totalPreferensi, m.id_penilaian]
          )
      }
    }

    res.status(200).json({ message: 'Data inserted successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const DeleteNilai = async (req, res) => {
  const id_penilaian = req.params.id

  try {
    // Delete data from data_penilaian_detail
    await pool
      .promise()
      .query(
        'DELETE FROM data_penilaian_detail WHERE id_penilaian_detail = ?',
        [id_penilaian]
      )

    // Delete data from data_penilaian_header
    await pool
      .promise()
      .query('DELETE FROM data_penilaian_header WHERE id_penilaian = ?', [
        id_penilaian,
      ])

    await pool
      .promise()
      .query(
        'DELETE FROM matriks_penilaian_detail WHERE id_matriks_detail = ?',
        [id_penilaian]
      )

    // Delete data from data_penilaian_header
    await pool
      .promise()
      .query('DELETE FROM matriks_penilaian_header WHERE id_matriks = ?', [
        id_penilaian,
      ])

    res.status(200).json({ message: 'Data deleted successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const GetMatrixs = async (req, res) => {
  try {
    // Fetch all data from data_penilaian_header
    const [headerResults] = await pool.promise().query(
      `
        SELECT p.id_pegawai, h.alternatif, h.id_matriks
        FROM pegawai p
        JOIN matriks_penilaian_header h ON p.id_pegawai = h.id_pegawai;
      `
    )

    // Check if any results were found
    if (headerResults.length === 0) {
      return res.status(404).send('No data found')
    }

    const responseData = []

    // Iterate through each header record
    for (const headerData of headerResults) {
      // Fetch details from data_penilaian_detail for each header record
      const [detailsResults] = await pool.promise().query(
        `
            SELECT
              d.id_kriteria,
              d.nilai,
              k.nama AS kriteria_nama,
              k.code,
              d.preferensi
            FROM
              matriks_penilaian_detail d
            JOIN
              kriteria k ON d.id_kriteria = k.id_kriteria
            WHERE
              d.id_matriks_detail = ?;
          `,
        [headerData.id_matriks]
      )

      // Combine header and details data
      const result = {
        id_pegawai: headerData.id_pegawai,
        alternatif: headerData.alternatif,
        details: detailsResults,
      }

      // Push the combined data to the response array
      responseData.push(result)
    }

    // Send the JSON response
    res.json(responseData)
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).send('Internal Server Error')
  }
}

const GetRanks = async (req, res) => {
  const { tahun, size } = req.query

  try {
    // Fetch all data from data_penilaian_header
    const [headerResults] = await pool.promise().query(
      `
        SELECT
          p.id_pegawai,
          p.divisi,
          p.nik,
          p.nama,
          h.alternatif,
          d.id_penilaian,
          h.total,
          d.tahun,
          h.alternatif
        FROM
          pegawai p
        JOIN matriks_penilaian_header h ON p.id_pegawai = h.id_pegawai
        JOIN data_penilaian_header d ON p.id_pegawai = d.id_pegawai
        WHERE
          d.tahun = ?
        ORDER BY h.total DESC
        LIMIT ?
      `,
      [tahun, parseInt(size, 10)]
    )

    // Check if any results were found
    if (headerResults.length === 0) {
      return res.status(404).send('No data found')
    }

    const responseData = []

    // Iterate through each header record
    for (const headerData of headerResults) {
      // Fetch details from data_penilaian_detail for each header record
      const [detailsResults] = await pool.promise().query(
        `
                SELECT
                  d.id_kriteria,
                  d.nilai,
                  k.nama AS kriteria_nama,
                  k.code,
                  d.preferensi
                FROM
                  matriks_penilaian_detail d
                JOIN
                  kriteria k ON d.id_kriteria = k.id_kriteria
                WHERE
                  d.id_matriks_detail = ?;
              `,
        [headerData.id_penilaian]
      )

      // Combine header and details data
      const result = {
        id_pegawai: headerData.id_pegawai,
        divisi: headerData.divisi,
        nik: headerData.nik,
        nama: headerData.nama,
        alternatif: headerData.alternatif,
        total: headerData.total,
        tahun: headerData.tahun,
        details: detailsResults,
      }

      // Push the combined data to the response array
      responseData.push(result)
    }

    // Send the JSON response
    res.json(responseData)
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).send('Internal Server Error')
  }
}

module.exports = {
  GetAllNilai,
  GetNilai,
  AddNilai,
  EditNilai,
  DeleteNilai,
  GetMatrixs,
  GetRanks,
}
